// Reemplaza el viejo loginAs(nombre): ya no hay auto-creación de cuentas al
// loguear con un correo desconocido, así que cualquier test que necesite una
// sesión debe aprovisionar la cuenta primero -- vía POST /internal/admin/users
// (sesionServer.js), el mismo camino que usaría un administrador real,
// reutilizando sesionFetch (el mismo cliente que usa server.js en producción)
// en vez de reimplementar la llamada HTTP o insertar directo en la tabla.
import request from "supertest";
import { sesionFetch } from "../sesionClient.js";

let seq = 0;

export async function provisionUser({ correo, nombre = "", rol = "editor" } = {}) {
  const correoFinal = correo || `test-${++seq}@example.com`;
  return sesionFetch("/internal/admin/users", {
    method: "POST",
    body: JSON.stringify({ correo: correoFinal, nombre, rol }),
  });
}

export async function provisionAndLogin(app, overrides = {}) {
  const user = await provisionUser(overrides);
  const agent = request.agent(app);
  await agent.post("/api/session/login").send({ correo: user.correo }).expect(200);
  return { agent, user };
}
