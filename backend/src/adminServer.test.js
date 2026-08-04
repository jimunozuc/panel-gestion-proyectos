// Importar testUtils/db ANTES que adminServer.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./adminServer.js";

before(setupTestDb);
beforeEach(resetDb);

async function seedAuditLog({ entityType = "nodo", accion = "crear", userNombre = "Tester" } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO audit_log (user_nombre, entity_type, accion) VALUES ($1, $2, $3) RETURNING id`,
    [userNombre, entityType, accion]
  );
  return rows[0].id;
}

test("responde 401 si ADMIN_SECRET está seteado y el header no coincide", async () => {
  process.env.ADMIN_SECRET = "test-secret";
  try {
    await request(app).get("/internal/audit-log").expect(401);
    await request(app)
      .get("/internal/audit-log")
      .set("x-admin-secret", "incorrecto")
      .expect(401);
    await request(app)
      .get("/internal/audit-log")
      .set("x-admin-secret", "test-secret")
      .expect(200);
  } finally {
    delete process.env.ADMIN_SECRET;
  }
});

test("GET /internal/audit-log devuelve las filas más recientes primero", async () => {
  await seedAuditLog({ accion: "crear" });
  await new Promise((r) => setTimeout(r, 10));
  await seedAuditLog({ accion: "editar" });

  const res = await request(app).get("/internal/audit-log").expect(200);
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].accion, "editar");
  assert.equal(res.body[1].accion, "crear");
});

test("GET /internal/audit-log filtra por entityType", async () => {
  await seedAuditLog({ entityType: "nodo" });
  await seedAuditLog({ entityType: "proyecto_solicitud" });

  const res = await request(app)
    .get("/internal/audit-log")
    .query({ entityType: "proyecto_solicitud" })
    .expect(200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].entity_type, "proyecto_solicitud");
});

test("GET /internal/audit-log respeta limit y offset", async () => {
  for (let i = 0; i < 3; i++) {
    await seedAuditLog({ accion: `accion-${i}` });
  }

  const primera = await request(app).get("/internal/audit-log").query({ limit: 1 }).expect(200);
  assert.equal(primera.body.length, 1);
  assert.equal(primera.body[0].accion, "accion-2");

  const segunda = await request(app).get("/internal/audit-log").query({ limit: 1, offset: 1 }).expect(200);
  assert.equal(segunda.body.length, 1);
  assert.equal(segunda.body[0].accion, "accion-1");
});
