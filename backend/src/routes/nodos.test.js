// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente por server.js) abra la conexión.
import { pool, setupTestDb, resetDb } from "../testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server.js";

before(setupTestDb);
beforeEach(resetDb);

// Login sin contraseña: el primer nombre que entra en la base (limpia por
// resetDb en cada test) queda administrador automáticamente — suficiente
// para pasar requireEditor (solo bloquea a "lector").
async function loginAs(nombre) {
  const agent = request.agent(app);
  await agent.post("/api/session/login").send({ nombre }).expect(200);
  return agent;
}

test("un editor puede crear un nodo y queda registrado en audit_log", async () => {
  const admin = await loginAs("Admin Test");
  const res = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Nueva tarea", tipo: "Tarea" })
    .expect(201);

  const { rows } = await pool.query("SELECT * FROM audit_log WHERE entity_id = $1", [res.body.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].accion, "crear");
});

test("un lector no puede crear nodos (403) — PR #16", async () => {
  await loginAs("Admin Test"); // ocupa el cupo de "primer usuario" -> administrador
  const lector = await loginAs("Lector Test"); // segundo usuario -> editor por defecto
  await pool.query("UPDATE users SET rol = 'lector' WHERE nombre = $1", ["Lector Test"]);

  await lector
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "No debería crearse", tipo: "Tarea" })
    .expect(403);
});

test("tipo inválido se rechaza (regresión PR #17)", async () => {
  const admin = await loginAs("Admin Test");
  await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "X", tipo: "NoValido" })
    .expect(400);
});

test("no se puede crear un nodo bajo un padre de otra hoja (regresión PR #17)", async () => {
  const admin = await loginAs("Admin Test");
  const padre = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Padre", tipo: "Tarea" })
    .expect(201);

  await admin
    .post("/api/iniciativas/SHEET_B/nodos")
    .send({ nombre: "Hijo cruzado", tipo: "Tarea", parentId: padre.body.id })
    .expect(400);
});

test("no se pueden agregar hijos a un nodo de nivel 3 (regresión PR #17)", async () => {
  const admin = await loginAs("Admin Test");
  const n1 = await admin.post("/api/iniciativas/SHEET_A/nodos").send({ nombre: "N1", tipo: "Tarea" }).expect(201);
  const n2 = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N2", tipo: "Tarea", parentId: n1.body.id })
    .expect(201);
  const n3 = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N3", tipo: "Tarea", parentId: n2.body.id })
    .expect(201);

  await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N4 inválido", tipo: "Tarea", parentId: n3.body.id })
    .expect(400);
});

test("PATCH actualiza un campo y registra el cambio en audit_log", async () => {
  const admin = await loginAs("Admin Test");
  const created = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Editar", tipo: "Tarea" })
    .expect(201);

  await admin.patch(`/api/nodos/${created.body.id}`).send({ avance: 80 }).expect(200);

  const { rows } = await pool.query("SELECT avance FROM nodos WHERE id = $1", [created.body.id]);
  assert.equal(rows[0].avance, 80);
});

test("DELETE elimina el nodo", async () => {
  const admin = await loginAs("Admin Test");
  const created = await admin
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Borrar", tipo: "Tarea" })
    .expect(201);

  await admin.delete(`/api/nodos/${created.body.id}`).expect(200);

  const { rows } = await pool.query("SELECT * FROM nodos WHERE id = $1", [created.body.id]);
  assert.equal(rows.length, 0);
});
