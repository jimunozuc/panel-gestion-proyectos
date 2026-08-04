// Importar testUtils/db ANTES que server.js: fija DATABASE_URL=TEST_DATABASE_URL
// antes de que pool.js (importado transitivamente) abra la conexión.
import { pool, setupTestDb, resetDb } from "../testUtils/db.js";
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server.js";
import { app as sesionApp } from "../sesionServer.js";
import { provisionAndLogin } from "../testUtils/auth.js";

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

async function seedNodo({ sheetId, tipo, responsable, avance }) {
  await pool.query(
    `INSERT INTO nodos (sheet_id, parent_id, nivel, orden, nombre, tipo, responsable, avance, origen)
     VALUES ($1, NULL, 1, 0, 'X', $2, $3, $4, 'manual')`,
    [sheetId, tipo, responsable, avance]
  );
}

test("responde 401 sin sesión", async () => {
  await request(app).get("/api/perfil/resumen").expect(401);
});

test("cuenta tareas pendientes, proyectos activos e hitos realizados solo del usuario en sesión", async () => {
  await seedNodo({ sheetId: "P6.1.1", tipo: "Tarea", responsable: "Ana", avance: 40 });
  await seedNodo({ sheetId: "P6.1.1", tipo: "Hito", responsable: "Ana", avance: 100 });
  await seedNodo({ sheetId: "P6.1.2", tipo: "Tarea", responsable: "Ana", avance: 100 }); // completada, no cuenta como pendiente
  await seedNodo({ sheetId: "P6.1.3", tipo: "Tarea", responsable: "Otra Persona", avance: 10 }); // de otro responsable

  const { agent: ana } = await provisionAndLogin(app, { correo: "ana@test.local", nombre: "Ana" });
  const res = await ana.get("/api/perfil/resumen").expect(200);

  assert.equal(res.body.nombre, "Ana");
  assert.equal(res.body.tareasPendientes, 1);
  assert.equal(res.body.hitosRealizados, 1);
  assert.equal(res.body.proyectosActivos, 1); // solo P6.1.1 tiene algo sin cerrar
});

test("sin nodos asignados, responde ceros (no 404 ni error)", async () => {
  const { agent: nadie } = await provisionAndLogin(app, {
    correo: "nadie-asignado@test.local",
    nombre: "Nadie Asignado",
  });
  const res = await nadie.get("/api/perfil/resumen").expect(200);
  assert.deepEqual(
    { tareasPendientes: res.body.tareasPendientes, proyectosActivos: res.body.proyectosActivos, hitosRealizados: res.body.hitosRealizados },
    { tareasPendientes: 0, proyectosActivos: 0, hitosRealizados: 0 }
  );
});
