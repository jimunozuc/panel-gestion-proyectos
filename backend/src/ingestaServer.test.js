// Importar testUtils/db ANTES que ingestaServer.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente vía nodos.js) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import ExcelJS from "exceljs";
import { app } from "./ingestaServer.js";

before(setupTestDb);
beforeEach(resetDb);

async function ganttBuffer(sheetName, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(["Nivel", "Tipo", "Nombre", "% avance"]);
  for (const r of rows) sheet.addRow([r.Nivel, r.Tipo, r.Nombre, r["% avance"] ?? null]);
  return workbook.xlsx.writeBuffer();
}

test("responde 401 sin secreto o con uno incorrecto", async () => {
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

test("responde 400 si el body viene vacío", async () => {
  process.env.REFRESH_SECRET = "test-secret";
  try {
    await request(app)
      .post("/api/webhook/refresh")
      .set("x-refresh-secret", "test-secret")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.alloc(0))
      .expect(400);
  } finally {
    delete process.env.REFRESH_SECRET;
  }
});

test("con secreto correcto y un archivo válido, importa a Postgres de verdad (no solo responde 200)", async () => {
  const buf = await ganttBuffer("SHEET_INGESTA", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);
  process.env.REFRESH_SECRET = "test-secret";
  try {
    const res = await request(app)
      .post("/api/webhook/refresh")
      .set("x-refresh-secret", "test-secret")
      .set("Content-Type", "application/octet-stream")
      .send(buf)
      .expect(200);
    assert.equal(res.body.status, "ok");
    assert.ok(res.body.updatedAt);
  } finally {
    delete process.env.REFRESH_SECRET;
  }

  const { rows } = await pool.query("SELECT nombre FROM nodos WHERE sheet_id = $1", ["SHEET_INGESTA"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nombre, "Línea 1");
});
