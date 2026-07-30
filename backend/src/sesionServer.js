import express from "express";
import { pool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";

const app = express();
const PORT = process.env.PORT || 3003;

export { app };

// Servicio interno, no lo llama el navegador: server.js le delega la
// lógica de usuarios/roles (mismo patrón que ingestaServer.js con
// REFRESH_SECRET). Sin cors ni cookie-parser — no hace falta, la cookie de
// sesión la sigue emitiendo server.js en su propio dominio.
app.use(express.json());

app.use("/internal", (req, res, next) => {
  const expected = process.env.SESION_SECRET;
  const provided = req.get("x-sesion-secret");
  if (expected && provided !== expected) {
    res.status(401).json({ error: "Secreto inválido" });
    return;
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "sesion" });
});

app.get("/internal/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, rol FROM users ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible" });
  }
});

app.get("/internal/admin/users", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.nombre, u.rol, u.created_at, u.last_login_at,
             la.created_at AS last_action_at, la.accion AS last_action
      FROM users u
      LEFT JOIN LATERAL (
        SELECT created_at, accion FROM audit_log
        WHERE user_id = u.id
        ORDER BY created_at DESC LIMIT 1
      ) la ON true
      ORDER BY u.nombre
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/internal/admin/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rol = req.body?.rol;
  if (!["administrador", "editor", "lector"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  try {
    const { rows } = await pool.query(
      "UPDATE users SET rol = $1 WHERE id = $2 RETURNING id, nombre, rol",
      [rol, id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "No existe" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sin contraseña: si el nombre no existe se crea al vuelo. El primer
// usuario que se registra en todo el sistema queda como administrador; el
// resto entra como editor y un administrador le cambia el rol después.
// BOOTSTRAP_ADMIN_NAMES (env var, nombres separados por coma) cubre el caso
// en que la regla "primer usuario = admin" no alcanza. Se aplica en cada
// login, no solo al crear el usuario.
function bootstrapAdminNames() {
  return String(process.env.BOOTSTRAP_ADMIN_NAMES || "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

app.post("/internal/login", async (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  if (!nombre) {
    res.status(400).json({ error: "Falta el nombre" });
    return;
  }

  try {
    const existing = await pool.query(
      "SELECT id, nombre, rol FROM users WHERE lower(nombre) = lower($1)",
      [nombre]
    );
    let user = existing.rows[0];
    const isBootstrapAdmin = bootstrapAdminNames().includes(nombre.toLowerCase());

    if (!user) {
      const { rows: countRows } = await pool.query("SELECT count(*)::int AS n FROM users");
      const rol = isBootstrapAdmin || countRows[0].n === 0 ? "administrador" : "editor";
      const inserted = await pool.query(
        "INSERT INTO users (nombre, rol, last_login_at) VALUES ($1, $2, now()) RETURNING id, nombre, rol",
        [nombre, rol]
      );
      user = inserted.rows[0];
    } else {
      if (isBootstrapAdmin && user.rol !== "administrador") {
        const updated = await pool.query(
          "UPDATE users SET rol = 'administrador' WHERE id = $1 RETURNING id, nombre, rol",
          [user.id]
        );
        user = updated.rows[0];
      }
      await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
    }

    res.json({ user });
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible" });
  }
});

async function start() {
  try {
    await runMigrations();
    console.log("Migraciones de Postgres aplicadas.");
  } catch (err) {
    console.warn(
      "No se pudo conectar a Postgres — el servicio de sesión sigue arriba pero no podrá autenticar a nadie hasta que Postgres esté disponible. Detalle:",
      err.message
    );
  }

  app.listen(PORT, () => {
    console.log(`Sesión escuchando en http://localhost:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
