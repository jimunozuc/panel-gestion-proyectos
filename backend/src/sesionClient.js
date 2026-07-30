// Cliente HTTP interno hacia sesionServer.js (servicio aparte, ver README
// ## Microservicios). server.js nunca expone estas rutas al navegador tal
// cual: las usa para delegar la lógica de usuarios/roles, y sigue siendo
// quien emite/lee la cookie de sesión en su propio dominio.
//
// SESION_URL se lee en cada llamada, no una vez al importar: los tests
// arrancan sesionServer.js en un puerto efímero y necesitan poder fijar la
// variable después de que este módulo ya se importó transitivamente.
export async function sesionFetch(path, options = {}) {
  const SESION_URL = process.env.SESION_URL || "http://localhost:3003";
  const res = await fetch(`${SESION_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SESION_SECRET ? { "x-sesion-secret": process.env.SESION_SECRET } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body?.error || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return body;
}
