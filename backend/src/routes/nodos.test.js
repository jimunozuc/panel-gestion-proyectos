// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente por server.js) abra la conexión.
import { pool, setupTestDb, resetDb } from "../testUtils/db.js";
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { app } from "../server.js";
import { app as sesionApp } from "../sesionServer.js";
import { provisionAndLogin } from "../testUtils/auth.js";

// login/usuarios ahora los maneja sesionServer.js — server.js le delega esa
// lógica por HTTP (ver sesionClient.js). Para el test, arrancamos ese
// servicio en un puerto efímero y apuntamos SESION_URL ahí: mismo patrón que
// webhookToApi.test.js (2 apps Express reales compartiendo un solo pool),
// no un mock.
let sesionServerHandle;

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
after(() => new Promise((resolve) => sesionServerHandle.close(resolve)));
beforeEach(resetDb);

test("un editor puede crear un nodo y queda registrado en audit_log", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  const res = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Nueva tarea", tipo: "Tarea" })
    .expect(201);

  const { rows } = await pool.query("SELECT * FROM audit_log WHERE entity_id = $1", [res.body.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].accion, "crear");
});

test("un lector no puede crear nodos (403) — PR #16", async () => {
  const { agent: lector } = await provisionAndLogin(app, { rol: "lector" });

  await lector
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "No debería crearse", tipo: "Tarea" })
    .expect(403);
});

test("tipo inválido se rechaza (regresión PR #17)", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "X", tipo: "NoValido" })
    .expect(400);
});

test("no se puede crear un nodo bajo un padre de otra hoja (regresión PR #17)", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  const padre = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Padre", tipo: "Tarea" })
    .expect(201);

  await editor
    .post("/api/iniciativas/SHEET_B/nodos")
    .send({ nombre: "Hijo cruzado", tipo: "Tarea", parentId: padre.body.id })
    .expect(400);
});

test("no se pueden agregar hijos a un nodo de nivel 3 (regresión PR #17)", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  const n1 = await editor.post("/api/iniciativas/SHEET_A/nodos").send({ nombre: "N1", tipo: "Tarea" }).expect(201);
  const n2 = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N2", tipo: "Tarea", parentId: n1.body.id })
    .expect(201);
  const n3 = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N3", tipo: "Tarea", parentId: n2.body.id })
    .expect(201);

  await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "N4 inválido", tipo: "Tarea", parentId: n3.body.id })
    .expect(400);
});

test("PATCH actualiza un campo y registra el cambio en audit_log", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  const created = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Editar", tipo: "Tarea" })
    .expect(201);

  await editor.patch(`/api/nodos/${created.body.id}`).send({ avance: 80 }).expect(200);

  const { rows } = await pool.query("SELECT avance FROM nodos WHERE id = $1", [created.body.id]);
  assert.equal(rows[0].avance, 80);
});

test("DELETE elimina el nodo", async () => {
  const { agent: editor } = await provisionAndLogin(app, { rol: "editor" });
  const created = await editor
    .post("/api/iniciativas/SHEET_A/nodos")
    .send({ nombre: "Borrar", tipo: "Tarea" })
    .expect(201);

  await editor.delete(`/api/nodos/${created.body.id}`).expect(200);

  const { rows } = await pool.query("SELECT * FROM nodos WHERE id = $1", [created.body.id]);
  assert.equal(rows.length, 0);
});

test("ver-como: una cuenta habilitada cambia de rol temporalmente y el backend lo aplica de verdad", async () => {
  const { agent: admin, user } = await provisionAndLogin(app, { rol: "administrador", correo: "vercomo-admin@test.local" });
  process.env.VER_COMO_CORREOS = user.correo;
  try {
    await admin.post("/api/session/ver-como").send({ rol: "lector" }).expect(200);

    const viendo = await admin.get("/api/session").expect(200);
    assert.equal(viendo.body.user.rol, "lector");
    assert.equal(viendo.body.user.rolReal, "administrador");
    assert.equal(viendo.body.user.viendoComo, true);

    await admin
      .post("/api/iniciativas/SHEET_A/nodos")
      .send({ nombre: "No debería crearse viendo como lector", tipo: "Tarea" })
      .expect(403);

    await admin.post("/api/session/ver-como/salir").expect(200);
    const restaurada = await admin.get("/api/session").expect(200);
    assert.equal(restaurada.body.user.rol, "administrador");
    assert.equal(restaurada.body.user.viendoComo, undefined);
  } finally {
    delete process.env.VER_COMO_CORREOS;
  }
});

test("ver-como: una cuenta no habilitada no puede usarlo (403)", async () => {
  const { agent: admin } = await provisionAndLogin(app, { rol: "administrador" });
  // sin VER_COMO_CORREOS seteado, nadie está habilitado
  await admin.post("/api/session/ver-como").send({ rol: "lector" }).expect(403);
});

test("ver-como: solo administradores, aunque el correo esté en VER_COMO_CORREOS", async () => {
  const { agent: editor, user } = await provisionAndLogin(app, { rol: "editor", correo: "vercomo-editor@test.local" });
  process.env.VER_COMO_CORREOS = user.correo;
  try {
    await editor.post("/api/session/ver-como").send({ rol: "lector" }).expect(403);
  } finally {
    delete process.env.VER_COMO_CORREOS;
  }
});
