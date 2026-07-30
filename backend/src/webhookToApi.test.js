// Importar testUtils/db ANTES que cualquiera de los dos servidores: fija
// DATABASE_URL=TEST_DATABASE_URL antes de que pool.js abra la conexión.
//
// ingestaApp y apiApp son 2 procesos distintos en producción, pero acá
// comparten el mismo pool de Postgres (el mismo singleton, no solo la misma
// connection string — node --test corre cada ARCHIVO en su propio proceso,
// y ambos módulos importan el mismo db/pool.js ya cacheado por ESM). Esto
// ejercita el seam real entre los dos servicios sin mockear nada: push real
// vía HTTP contra ingestaApp, lectura real vía HTTP contra apiApp.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import ExcelJS from "exceljs";
import { app as ingestaApp } from "./ingestaServer.js";
import { app as apiApp } from "./server.js";

before(setupTestDb);
beforeEach(resetDb);

async function ganttBuffer(sheetName, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(["Nivel", "Tipo", "Nombre", "% avance"]);
  for (const r of rows) sheet.addRow([r.Nivel, r.Tipo, r.Nombre, r["% avance"] ?? null]);
  return workbook.xlsx.writeBuffer();
}

async function pushToIngesta(sheetName, rows) {
  const buf = await ganttBuffer(sheetName, rows);
  process.env.REFRESH_SECRET = "test-secret";
  try {
    await request(ingestaApp)
      .post("/api/webhook/refresh")
      .set("x-refresh-secret", "test-secret")
      .set("Content-Type", "application/octet-stream")
      .send(buf)
      .expect(200);
  } finally {
    delete process.env.REFRESH_SECRET;
  }
}

test("una hoja empujada a ingesta se lee desde la API vía Postgres y no se duplica en un segundo push", async () => {
  await pushToIngesta("SHEET_SEAM", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);

  const first = await request(apiApp).get("/api/iniciativas/SHEET_SEAM").expect(200);
  assert.equal(first.body.source, "postgres");
  assert.equal(first.body.editable, true);
  assert.equal(first.body.tree[0].nombre, "Línea 1");

  await pushToIngesta("SHEET_SEAM", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);
  const second = await request(apiApp).get("/api/iniciativas/SHEET_SEAM").expect(200);
  assert.equal(second.body.tree.length, first.body.tree.length);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM nodos WHERE sheet_id = $1", ["SHEET_SEAM"]);
  assert.equal(rows[0].n, 1);
});

test("una hoja empujada sin filas de datos responde 404 desde la API (nada que leer en Postgres)", async () => {
  await pushToIngesta("SHEET_SEAM_EMPTY", []);
  await request(apiApp).get("/api/iniciativas/SHEET_SEAM_EMPTY").expect(404);
});
