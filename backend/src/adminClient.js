// Cliente HTTP interno hacia adminServer.js (servicio aparte, ver README
// ## Microservicios). Hoy solo expone la lectura de audit_log — las
// escrituras se quedan donde ya estaban (nodos.js, session.js, admin.js).
//
// ADMIN_URL se lee en cada llamada, no una vez al importar: los tests
// arrancan adminServer.js en un puerto efímero y necesitan poder fijar la
// variable después de que este módulo ya se importó transitivamente.
export async function adminFetch(path, options = {}) {
  const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3004";
  const res = await fetch(`${ADMIN_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ADMIN_SECRET ? { "x-admin-secret": process.env.ADMIN_SECRET } : {}),
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
