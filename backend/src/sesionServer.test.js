// Importar testUtils/db ANTES que sesionServer.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./sesionServer.js";

before(setupTestDb);
beforeEach(resetDb);

async function provision(correo, rol = "editor", nombre = "") {
  const res = await request(app)
    .post("/internal/admin/users")
    .send({ correo, nombre, rol })
    .expect(201);
  return res.body;
}

test("responde 401 si SESION_SECRET está seteado y el header no coincide", async () => {
  process.env.SESION_SECRET = "test-secret";
  try {
    await request(app)
      .get("/internal/admin/users")
      .expect(401);
    await request(app)
      .get("/internal/admin/users")
      .set("x-sesion-secret", "incorrecto")
      .expect(401);
    await request(app)
      .get("/internal/admin/users")
      .set("x-sesion-secret", "test-secret")
      .expect(200);
  } finally {
    delete process.env.SESION_SECRET;
  }
});

test("login rechaza un correo no aprovisionado y sin BOOTSTRAP_ADMIN_EMAILS", async () => {
  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "nadie@test.local" })
    .expect(403);
  assert.match(res.body.error, /no tiene acceso/);
});

test("login con un correo en BOOTSTRAP_ADMIN_EMAILS crea la cuenta como administrador", async () => {
  process.env.BOOTSTRAP_ADMIN_EMAILS = "arranque@test.local";
  try {
    const res = await request(app)
      .post("/internal/login")
      .send({ correo: "Arranque@Test.Local" })
      .expect(200);
    assert.equal(res.body.user.rol, "administrador");
    assert.equal(res.body.user.correo, "arranque@test.local");
    assert.ok(res.body.user.id);

    const { rows } = await pool.query("SELECT last_login_at FROM users WHERE id = $1", [res.body.user.id]);
    assert.ok(rows[0].last_login_at, "el primer login debe fijar last_login_at");
  } finally {
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
  }
});

test("login rechaza un formato de correo inválido", async () => {
  await request(app).post("/internal/login").send({ correo: "no-es-un-correo" }).expect(400);
});

test("login de un usuario aprovisionado actualiza last_login_at sin duplicarlo", async () => {
  const user = await provision("repite@test.local");
  const { rows: before } = await pool.query("SELECT last_login_at FROM users WHERE id = $1", [user.id]);
  assert.equal(before[0].last_login_at, null, "una cuenta recién aprovisionada no tiene login todavía");

  await new Promise((r) => setTimeout(r, 10));
  await request(app).post("/internal/login").send({ correo: "repite@test.local" }).expect(200);
  const { rows: after } = await pool.query(
    "SELECT id, last_login_at FROM users WHERE correo = 'repite@test.local'"
  );

  assert.equal(after.length, 1, "no debe crear un segundo usuario con el mismo correo");
  assert.ok(after[0].last_login_at);
});

test("login rechaza una cuenta desactivada", async () => {
  const user = await provision("desactivado@test.local");
  await request(app).patch(`/internal/admin/users/${user.id}`).send({ activo: false }).expect(200);

  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "desactivado@test.local" })
    .expect(403);
  assert.match(res.body.error, /desactivada/);
});

test("GET /internal/admin/users incluye la última acción derivada de audit_log", async () => {
  const user = await provision("con-bitacora@test.local", "editor", "Con Bitacora");
  await pool.query(
    `INSERT INTO audit_log (user_id, user_nombre, entity_type, accion) VALUES ($1,$2,'nodo','crear')`,
    [user.id, "Con Bitacora"]
  );

  const res = await request(app).get("/internal/admin/users").expect(200);
  const u = res.body.find((r) => r.correo === "con-bitacora@test.local");
  assert.equal(u.last_action, "crear");
  assert.ok(u.last_action_at);
});

test("POST /internal/admin/users aprovisiona una cuenta con nombre por defecto igual al correo", async () => {
  const res = await request(app)
    .post("/internal/admin/users")
    .send({ correo: "sin-nombre@test.local", rol: "lector" })
    .expect(201);
  assert.equal(res.body.nombre, "sin-nombre@test.local");
  assert.equal(res.body.activo, true);
});

test("POST /internal/admin/users rechaza un correo duplicado", async () => {
  await provision("duplicado@test.local");
  await request(app)
    .post("/internal/admin/users")
    .send({ correo: "duplicado@test.local", rol: "editor" })
    .expect(409);
});

test("POST /internal/admin/users rechaza un rol inválido", async () => {
  await request(app)
    .post("/internal/admin/users")
    .send({ correo: "rol-malo@test.local", rol: "superadmin" })
    .expect(400);
});

test("PATCH /internal/admin/users/:id cambia el rol", async () => {
  const user = await provision("cambiar-rol@test.local");
  const res = await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ rol: "lector" })
    .expect(200);
  assert.equal(res.body.rol, "lector");
});

test("PATCH /internal/admin/users/:id rechaza un rol inválido", async () => {
  const user = await provision("rol-invalido@test.local");
  await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ rol: "superadmin" })
    .expect(400);
});

test("PATCH /internal/admin/users/:id cambia el nombre", async () => {
  const user = await provision("renombrar@test.local", "editor", "Nombre Viejo");
  const res = await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ nombre: "Nombre Nuevo" })
    .expect(200);
  assert.equal(res.body.nombre, "Nombre Nuevo");
});

test("PATCH /internal/admin/users/:id desactiva y reactiva una cuenta", async () => {
  const user = await provision("toggle@test.local");
  const off = await request(app).patch(`/internal/admin/users/${user.id}`).send({ activo: false }).expect(200);
  assert.equal(off.body.activo, false);
  const on = await request(app).patch(`/internal/admin/users/${user.id}`).send({ activo: true }).expect(200);
  assert.equal(on.body.activo, true);
});
