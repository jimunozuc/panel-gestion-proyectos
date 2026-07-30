// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente por server.js vía nodos.js) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import ExcelJS from "exceljs";
import { app } from "./server.js";

before(setupTestDb);
beforeEach(resetDb);

async function ganttBuffer(sheetName, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(["Nivel", "Tipo", "Nombre", "% avance"]);
  for (const r of rows) sheet.addRow([r.Nivel, r.Tipo, r.Nombre, r["% avance"] ?? null]);
  return workbook.xlsx.writeBuffer();
}

async function pushToWebhook(sheetName, rows) {
  const buf = await ganttBuffer(sheetName, rows);
  process.env.REFRESH_SECRET = "test-secret";
  try {
    await request(app)
      .post("/api/webhook/refresh")
      .set("x-refresh-secret", "test-secret")
      .set("Content-Type", "application/octet-stream")
      .send(buf)
      .expect(200);
  } finally {
    delete process.env.REFRESH_SECRET;
  }
}

test("GET /api/iniciativas/:num responde 404 si la hoja no existe en Excel ni en Postgres", async () => {
  await request(app).get("/api/iniciativas/NO_EXISTE").expect(404);
});

test("el webhook de refresh exige el secreto correcto (401 sin secreto o con uno incorrecto)", async () => {
  const buf = await ganttBuffer("SHEET_W", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);
  process.env.REFRESH_SECRET = "test-secret";
  try {
    await request(app)
      .post("/api/webhook/refresh")
      .set("Content-Type", "application/octet-stream")
      .send(buf)
      .expect(401);
    await request(app)
      .post("/api/webhook/refresh")
      .set("x-refresh-secret", "incorrecto")
      .set("Content-Type", "application/octet-stream")
      .send(buf)
      .expect(401);
  } finally {
    delete process.env.REFRESH_SECRET;
  }
});

test("una hoja recién refrescada por webhook se sirve desde Postgres y no se duplica en un segundo GET", async () => {
  await pushToWebhook("SHEET_Z", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);

  const first = await request(app).get("/api/iniciativas/SHEET_Z").expect(200);
  assert.equal(first.body.source, "postgres");
  assert.equal(first.body.editable, true);
  assert.equal(first.body.tree[0].nombre, "Línea 1");

  const second = await request(app).get("/api/iniciativas/SHEET_Z").expect(200);
  assert.equal(second.body.tree.length, first.body.tree.length);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM nodos WHERE sheet_id = $1", ["SHEET_Z"]);
  assert.equal(rows[0].n, 1);
});

test("una hoja sin filas de datos responde 404 (nada que importar, no es un caso de Postgres caído)", async () => {
  await pushToWebhook("SHEET_EMPTY", []); // solo encabezado, sin filas

  await request(app).get("/api/iniciativas/SHEET_EMPTY").expect(404);
});

test("si Postgres falla al leer, se sirve el Excel en memoria como resguardo (degradado, no editable)", async () => {
  await pushToWebhook("SHEET_FALLBACK", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);

  const originalQuery = pool.query.bind(pool);
  pool.query = async () => {
    throw new Error("simulado: Postgres no disponible");
  };
  try {
    const res = await request(app).get("/api/iniciativas/SHEET_FALLBACK").expect(200);
    assert.equal(res.body.editable, false);
    assert.equal(res.body.source, "power-automate");
    assert.equal(res.body.tree[0].nombre, "Línea 1");
  } finally {
    pool.query = originalQuery;
  }
});
