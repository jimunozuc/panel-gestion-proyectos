import express from "express";
import { pool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";

const app = express();
const PORT = process.env.PORT || 3004;

export { app };

// Tercer corte de microservicios (ver README ## Microservicios), mismo
// patrón que ingestaServer.js/sesionServer.js: servicio interno, no lo
// llama el navegador — server.js le delega vía src/adminClient.js. Sin
// cors ni cookie-parser, no hace falta.
app.use(express.json());

app.use("/internal", (req, res, next) => {
  const expected = process.env.ADMIN_SECRET;
  const provided = req.get("x-admin-secret");
  if (expected && provided !== expected) {
    res.status(401).json({ error: "Secreto inválido" });
    return;
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "admin" });
});

// Deliberadamente solo lectura: las escrituras a audit_log se quedan donde
// ya estaban (routes/nodos.js, routes/session.js, routes/admin.js) — un
// insert que ya va pegado a la escritura principal (crear un nodo, cambiar
// de rol al "ver como") no gana nada agregándole un salto de red aparte.
// Lo que sí se beneficia de tener su propio servicio es la lectura, que es
// lo único que este corte mueve.
app.get("/internal/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const entityType = req.query.entityType ? String(req.query.entityType) : null;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_nombre, entity_type, entity_id, sheet_id, campo, valor_anterior, valor_nuevo, accion, created_at
       FROM audit_log WHERE ($3::text IS NULL OR entity_type = $3)
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset, entityType]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  try {
    await runMigrations();
    console.log("Migraciones de Postgres aplicadas.");
  } catch (err) {
    console.warn(
      "No se pudo conectar a Postgres — el servicio de administración sigue arriba pero no podrá leer la bitácora hasta que Postgres esté disponible. Detalle:",
      err.message
    );
  }

  app.listen(PORT, () => {
    console.log(`Admin escuchando en http://localhost:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
