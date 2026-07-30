// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente por server.js vía nodos.js) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./server.js";

before(setupTestDb);
beforeEach(resetDb);

test("GET /api/iniciativas/:num responde 404 si la hoja no existe en Excel ni en Postgres", async () => {
  await request(app).get("/api/iniciativas/NO_EXISTE").expect(404);
});

test("si Postgres falla al leer, se sirve el Excel de ejemplo local como resguardo (degradado, no editable)", async () => {
  // server.js ya no tiene webhook propio (ver ingestaServer.js /
  // webhookToApi.test.js): el único cache en memoria posible acá es el
  // fallback local (data/panel_iniciativas.xlsx) — nunca un push real
  // reciente, la API nunca vuelve a llamar refreshFromUpload.
  const originalQuery = pool.query.bind(pool);
  pool.query = async () => {
    throw new Error("simulado: Postgres no disponible");
  };
  try {
    const res = await request(app).get("/api/iniciativas/6.1").expect(200);
    assert.equal(res.body.editable, false);
    assert.equal(res.body.source, "local-fallback");
    assert.equal(res.body.tree[0].nombre, "IA en el Currículum");
    assert.deepEqual(res.body.team, ["Pablo Barceló"]);
  } finally {
    pool.query = originalQuery;
  }
});
