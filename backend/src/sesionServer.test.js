// Importar testUtils/db ANTES que sesionServer.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./sesionServer.js";

before(setupTestDb);
beforeEach(resetDb);

test("responde 401 si SESION_SECRET está seteado y el header no coincide", async () => {
  process.env.SESION_SECRET = "test-secret";
  try {
    await request(app)
      .get("/internal/users")
      .expect(401);
    await request(app)
      .get("/internal/users")
      .set("x-sesion-secret", "incorrecto")
      .expect(401);
    await request(app)
      .get("/internal/users")
      .set("x-sesion-secret", "test-secret")
      .expect(200);
  } finally {
    delete process.env.SESION_SECRET;
  }
});

test("login crea un usuario nuevo; el primero de la base queda administrador", async () => {
  const res = await request(app)
    .post("/internal/login")
    .send({ nombre: "Persona Nueva" })
    .expect(200);
  assert.equal(res.body.user.rol, "administrador");
  assert.ok(res.body.user.id);

  const { rows } = await pool.query("SELECT last_login_at FROM users WHERE id = $1", [res.body.user.id]);
  assert.ok(rows[0].last_login_at, "el primer login debe fijar last_login_at");
});

test("login de un usuario existente actualiza last_login_at sin duplicarlo", async () => {
  const first = await request(app).post("/internal/login").send({ nombre: "Repite Login" }).expect(200);
  const { rows: before } = await pool.query("SELECT last_login_at FROM users WHERE id = $1", [first.body.user.id]);

  await new Promise((r) => setTimeout(r, 10));
  await request(app).post("/internal/login").send({ nombre: "Repite Login" }).expect(200);
  const { rows: after } = await pool.query(
    "SELECT id, last_login_at FROM users WHERE nombre = 'Repite Login'"
  );

  assert.equal(after.length, 1, "no debe crear un segundo usuario con el mismo nombre");
  assert.ok(new Date(after[0].last_login_at) > new Date(before[0].last_login_at));
});

test("GET /internal/admin/users incluye la última acción derivada de audit_log", async () => {
  const login = await request(app).post("/internal/login").send({ nombre: "Con Bitacora" }).expect(200);
  await pool.query(
    `INSERT INTO audit_log (user_id, user_nombre, entity_type, accion) VALUES ($1,$2,'nodo','crear')`,
    [login.body.user.id, "Con Bitacora"]
  );

  const res = await request(app).get("/internal/admin/users").expect(200);
  const u = res.body.find((r) => r.nombre === "Con Bitacora");
  assert.equal(u.last_action, "crear");
  assert.ok(u.last_action_at);
});

test("PATCH /internal/admin/users/:id cambia el rol", async () => {
  const login = await request(app).post("/internal/login").send({ nombre: "Cambiar Rol" }).expect(200);
  const res = await request(app)
    .patch(`/internal/admin/users/${login.body.user.id}`)
    .send({ rol: "lector" })
    .expect(200);
  assert.equal(res.body.rol, "lector");
});

test("PATCH /internal/admin/users/:id rechaza un rol inválido", async () => {
  const login = await request(app).post("/internal/login").send({ nombre: "Rol Invalido" }).expect(200);
  await request(app)
    .patch(`/internal/admin/users/${login.body.user.id}`)
    .send({ rol: "superadmin" })
    .expect(400);
});
