// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "../testUtils/db.js";
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server.js";
import { app as sesionApp } from "../sesionServer.js";
import { app as adminApp } from "../adminServer.js";
import { provisionAndLogin } from "../testUtils/auth.js";

let sesionServerHandle;
let adminServerHandle;

before(setupTestDb);
before(
  () =>
    new Promise((resolve) => {
      sesionServerHandle = sesionApp.listen(0, () => {
        process.env.SESION_URL = `http://localhost:${sesionServerHandle.address().port}`;
        resolve();
      });
    })
);
before(
  () =>
    new Promise((resolve) => {
      adminServerHandle = adminApp.listen(0, () => {
        process.env.ADMIN_URL = `http://localhost:${adminServerHandle.address().port}`;
        resolve();
      });
    })
);
after(() => new Promise((resolve) => sesionServerHandle.close(resolve)));
after(() => new Promise((resolve) => adminServerHandle.close(resolve)));
beforeEach(resetDb);

test("GET /api/audit-log responde 403 sin sesión", async () => {
  await request(app).get("/api/audit-log").expect(403);
});

test("GET /api/audit-log responde 403 para un rol no administrador", async () => {
  const { agent } = await provisionAndLogin(app, { correo: "editor@test.local", rol: "editor" });
  await agent.get("/api/audit-log").expect(403);
});

test("GET /api/audit-log delega en adminServer.js y devuelve las filas reales", async () => {
  await pool.query(
    `INSERT INTO audit_log (user_nombre, entity_type, accion) VALUES ('Tester', 'nodo', 'crear')`
  );
  const { agent } = await provisionAndLogin(app, { correo: "admin@test.local", rol: "administrador" });

  const res = await agent.get("/api/audit-log").expect(200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].accion, "crear");
});

test("GET /api/audit-log reenvía el filtro entityType al servicio de admin", async () => {
  await pool.query(
    `INSERT INTO audit_log (user_nombre, entity_type, accion) VALUES ('Tester', 'nodo', 'crear')`
  );
  await pool.query(
    `INSERT INTO audit_log (user_nombre, entity_type, accion) VALUES ('Tester', 'proyecto_solicitud', 'solicitud')`
  );
  const { agent } = await provisionAndLogin(app, { correo: "admin2@test.local", rol: "administrador" });

  const res = await agent
    .get("/api/audit-log")
    .query({ entityType: "proyecto_solicitud" })
    .expect(200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].entity_type, "proyecto_solicitud");
});
