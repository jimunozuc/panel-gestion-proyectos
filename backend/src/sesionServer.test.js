// Importar testUtils/db ANTES que sesionServer.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./sesionServer.js";

before(setupTestDb);
beforeEach(resetDb);

const CLAVE = "clave-de-prueba-1";

async function provision(correo, rol = "editor", nombre = "", password = CLAVE) {
  const res = await request(app)
    .post("/internal/admin/users")
    .send({ correo, nombre, rol, password })
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
    .send({ correo: "nadie@test.local", password: CLAVE })
    .expect(403);
  assert.match(res.body.error, /no tiene acceso/);
});

test("login rechaza si falta la contraseña", async () => {
  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "nadie@test.local" })
    .expect(400);
  assert.match(res.body.error, /contraseña/);
});

test("login con un correo en BOOTSTRAP_ADMIN_EMAILS crea la cuenta como administrador y fija su contraseña", async () => {
  process.env.BOOTSTRAP_ADMIN_EMAILS = "arranque@test.local";
  try {
    const res = await request(app)
      .post("/internal/login")
      .send({ correo: "Arranque@Test.Local", password: CLAVE })
      .expect(200);
    assert.equal(res.body.user.rol, "administrador");
    assert.equal(res.body.user.correo, "arranque@test.local");
    assert.ok(res.body.user.id);
    assert.equal(res.body.user.password_hash, undefined, "el hash nunca debe salir en la respuesta");

    const { rows } = await pool.query(
      "SELECT last_login_at, password_hash FROM users WHERE id = $1",
      [res.body.user.id]
    );
    assert.ok(rows[0].last_login_at, "el primer login debe fijar last_login_at");
    assert.ok(rows[0].password_hash, "el primer login de bootstrap debe fijar una contraseña");

    // Con la contraseña ya fijada, un segundo intento con otra distinta se rechaza.
    await request(app)
      .post("/internal/login")
      .send({ correo: "arranque@test.local", password: "otra-clave-cualquiera" })
      .expect(401);
  } finally {
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
  }
});

test("bootstrap rechaza una contraseña muy corta", async () => {
  process.env.BOOTSTRAP_ADMIN_EMAILS = "arranque2@test.local";
  try {
    await request(app)
      .post("/internal/login")
      .send({ correo: "arranque2@test.local", password: "corta" })
      .expect(400);
  } finally {
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
  }
});

test("login rechaza un formato de correo inválido", async () => {
  await request(app)
    .post("/internal/login")
    .send({ correo: "no-es-un-correo", password: CLAVE })
    .expect(400);
});

test("login de un usuario aprovisionado actualiza last_login_at sin duplicarlo", async () => {
  const user = await provision("repite@test.local");
  const { rows: before } = await pool.query("SELECT last_login_at FROM users WHERE id = $1", [user.id]);
  assert.equal(before[0].last_login_at, null, "una cuenta recién aprovisionada no tiene login todavía");

  await new Promise((r) => setTimeout(r, 10));
  await request(app)
    .post("/internal/login")
    .send({ correo: "repite@test.local", password: CLAVE })
    .expect(200);
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
    .send({ correo: "desactivado@test.local", password: CLAVE })
    .expect(403);
  assert.match(res.body.error, /desactivada/);
});

test("login rechaza una cuenta aprovisionada antes de existir contraseñas (password_hash null)", async () => {
  await pool.query(
    `INSERT INTO users (correo, nombre, rol, activo) VALUES ($1, $2, 'editor', true)`,
    ["sin-password@test.local", "Sin Password"]
  );
  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "sin-password@test.local", password: "cualquiera123" })
    .expect(403);
  assert.match(res.body.error, /no tiene contraseña asignada/);
});

test("login rechaza una contraseña incorrecta con mensaje genérico", async () => {
  await provision("clave-mala@test.local");
  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "clave-mala@test.local", password: "no-es-esta" })
    .expect(401);
  assert.match(res.body.error, /Correo o contraseña incorrectos/);
});

test("bloquea el login tras 5 intentos fallidos seguidos, incluso con la contraseña correcta", async () => {
  await provision("bloqueo@test.local", "editor", "", "clave-correcta-1");
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post("/internal/login")
      .send({ correo: "bloqueo@test.local", password: "clave-incorrecta" })
      .expect(401);
  }
  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "bloqueo@test.local", password: "clave-correcta-1" })
    .expect(429);
  assert.match(res.body.error, /Demasiados intentos/);
});

test("un login correcto resetea el contador de intentos fallidos", async () => {
  await provision("resetea-intentos@test.local", "editor", "", "clave-correcta-2");
  for (let i = 0; i < 4; i++) {
    await request(app)
      .post("/internal/login")
      .send({ correo: "resetea-intentos@test.local", password: "clave-incorrecta" })
      .expect(401);
  }
  // Al 4to intento fallido todavía no se bloquea (el límite es 5) y este
  // login correcto debe limpiar el contador.
  await request(app)
    .post("/internal/login")
    .send({ correo: "resetea-intentos@test.local", password: "clave-correcta-2" })
    .expect(200);
  await request(app)
    .post("/internal/login")
    .send({ correo: "resetea-intentos@test.local", password: "clave-incorrecta" })
    .expect(401);
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
    .send({ correo: "sin-nombre@test.local", rol: "lector", password: CLAVE })
    .expect(201);
  assert.equal(res.body.nombre, "sin-nombre@test.local");
  assert.equal(res.body.activo, true);
  assert.equal(res.body.password_hash, undefined, "el hash nunca debe salir en la respuesta");
});

test("POST /internal/admin/users rechaza una contraseña muy corta", async () => {
  await request(app)
    .post("/internal/admin/users")
    .send({ correo: "clave-corta@test.local", rol: "editor", password: "1234567" })
    .expect(400);
});

test("POST /internal/admin/users rechaza un correo duplicado", async () => {
  await provision("duplicado@test.local");
  await request(app)
    .post("/internal/admin/users")
    .send({ correo: "duplicado@test.local", rol: "editor", password: CLAVE })
    .expect(409);
});

test("POST /internal/admin/users rechaza un rol inválido", async () => {
  await request(app)
    .post("/internal/admin/users")
    .send({ correo: "rol-malo@test.local", rol: "superadmin", password: CLAVE })
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

test("PATCH /internal/admin/users/:id restablece la contraseña", async () => {
  const user = await provision("resetear-clave@test.local", "editor", "", "clave-vieja-1");
  await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ password: "clave-nueva-1" })
    .expect(200);

  await request(app)
    .post("/internal/login")
    .send({ correo: "resetear-clave@test.local", password: "clave-vieja-1" })
    .expect(401);
  await request(app)
    .post("/internal/login")
    .send({ correo: "resetear-clave@test.local", password: "clave-nueva-1" })
    .expect(200);
});

test("PATCH /internal/admin/users/:id rechaza una contraseña muy corta", async () => {
  const user = await provision("clave-corta-patch@test.local");
  await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ password: "corta" })
    .expect(400);
});

test("una cuenta creada por un administrador queda marcada para cambiar la contraseña", async () => {
  const user = await provision("debe-cambiar@test.local");
  const { rows } = await pool.query("SELECT must_change_password FROM users WHERE id = $1", [user.id]);
  assert.equal(rows[0].must_change_password, true);

  const res = await request(app)
    .post("/internal/login")
    .send({ correo: "debe-cambiar@test.local", password: CLAVE })
    .expect(200);
  assert.equal(res.body.user.must_change_password, true);
});

test("una cuenta creada por bootstrap NO queda marcada (eligió su propia contraseña)", async () => {
  process.env.BOOTSTRAP_ADMIN_EMAILS = "arranque3@test.local";
  try {
    const res = await request(app)
      .post("/internal/login")
      .send({ correo: "arranque3@test.local", password: CLAVE })
      .expect(200);
    assert.equal(res.body.user.must_change_password, false);
  } finally {
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
  }
});

test("restablecer la contraseña de una cuenta existente la vuelve a marcar para cambiar", async () => {
  const user = await provision("resetear-marca@test.local");
  await request(app)
    .patch(`/internal/admin/users/${user.id}`)
    .send({ password: "clave-nueva-2" })
    .expect(200);
  const { rows } = await pool.query("SELECT must_change_password FROM users WHERE id = $1", [user.id]);
  assert.equal(rows[0].must_change_password, true);
});

test("POST /internal/change-password fija la contraseña propia y limpia must_change_password", async () => {
  const user = await provision("cambia-clave@test.local");
  const res = await request(app)
    .post("/internal/change-password")
    .send({ id: user.id, password: "mi-clave-propia-1" })
    .expect(200);
  assert.equal(res.body.must_change_password, false);

  await request(app)
    .post("/internal/login")
    .send({ correo: "cambia-clave@test.local", password: CLAVE })
    .expect(401);
  const login = await request(app)
    .post("/internal/login")
    .send({ correo: "cambia-clave@test.local", password: "mi-clave-propia-1" })
    .expect(200);
  assert.equal(login.body.user.must_change_password, false);
});

test("POST /internal/change-password rechaza una contraseña muy corta", async () => {
  const user = await provision("cambia-clave-corta@test.local");
  await request(app)
    .post("/internal/change-password")
    .send({ id: user.id, password: "corta" })
    .expect(400);
});

test("POST /internal/change-password responde 404 para un id inexistente", async () => {
  await request(app)
    .post("/internal/change-password")
    .send({ id: 999999, password: "clave-cualquiera-1" })
    .expect(404);
});
