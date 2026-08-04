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

app.get("/internal/admin/users", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.nombre, u.correo, u.rol, u.activo, u.created_at, u.last_login_at,
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

// Aprovisiona una cuenta antes de su primer login — un administrador es
// quien decide correo+rol de antemano, no la persona al loguearse.
app.post("/internal/admin/users", async (req, res) => {
  const correo = String(req.body?.correo || "").trim().toLowerCase();
  const nombre = String(req.body?.nombre || "").trim();
  const rol = req.body?.rol;
  if (!correo || !CORREO_RE.test(correo)) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }
  if (!["administrador", "editor", "lector"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (correo, nombre, rol, activo)
       VALUES ($1, $2, $3, true)
       RETURNING id, nombre, correo, rol, activo, created_at, last_login_at`,
      [correo, nombre || correo, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// rol, nombre y activo son independientes entre sí — el body puede traer
// uno, dos o los tres a la vez; solo se actualizan los que vienen presentes.
app.patch("/internal/admin/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const sets = [];
  const values = [];

  if (body.rol !== undefined) {
    if (!["administrador", "editor", "lector"].includes(body.rol)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    values.push(body.rol);
    sets.push(`rol = $${values.length}`);
  }
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim();
    if (!nombre) {
      res.status(400).json({ error: "El nombre no puede quedar vacío" });
      return;
    }
    values.push(nombre);
    sets.push(`nombre = $${values.length}`);
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== "boolean") {
      res.status(400).json({ error: "activo debe ser boolean" });
      return;
    }
    values.push(body.activo);
    sets.push(`activo = $${values.length}`);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: "Nada para actualizar (rol, nombre y/o activo)" });
    return;
  }

  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${values.length}
       RETURNING id, nombre, correo, rol, activo`,
      values
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

// Sin contraseña, aprovisionado por un administrador: un correo solo puede
// iniciar sesión si ya tiene una fila en `users` (creada desde Admin.jsx) o
// si está en BOOTSTRAP_ADMIN_EMAILS. Ya no existe "el primer usuario del
// sistema queda administrador" ni "se crea la cuenta al vuelo con
// cualquier nombre": correo no reconocido y no bootstrap = 403.
// BOOTSTRAP_ADMIN_EMAILS (env var, correos separados por coma) es el
// mecanismo de arranque: sin él, nadie podría darse de alta a sí mismo como
// el primer administrador. Se aplica en cada login, no solo al crear la
// cuenta (si se agrega un correo a la lista después de que esa cuenta ya
// existía con otro rol, el próximo login la vuelve a promover).
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bootstrapAdminEmails() {
  return String(process.env.BOOTSTRAP_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

app.post("/internal/login", async (req, res) => {
  const correo = String(req.body?.correo || "").trim().toLowerCase();
  const nombre = String(req.body?.nombre || "").trim();
  if (!correo) {
    res.status(400).json({ error: "Falta el correo" });
    return;
  }
  if (!CORREO_RE.test(correo)) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }

  try {
    const existing = await pool.query(
      "SELECT id, nombre, rol, correo, activo FROM users WHERE correo = $1",
      [correo]
    );
    let user = existing.rows[0];
    const isBootstrapAdmin = bootstrapAdminEmails().includes(correo);

    if (!user) {
      if (!isBootstrapAdmin) {
        res.status(403).json({
          error: "Tu correo no tiene acceso. Pide a un administrador que te dé de alta.",
        });
        return;
      }
      const inserted = await pool.query(
        `INSERT INTO users (correo, nombre, rol, activo, last_login_at)
         VALUES ($1, $2, 'administrador', true, now())
         RETURNING id, nombre, rol, correo, activo`,
        [correo, nombre || correo]
      );
      user = inserted.rows[0];
    } else {
      if (!user.activo) {
        res.status(403).json({ error: "Tu cuenta está desactivada. Contacta a un administrador." });
        return;
      }
      if (isBootstrapAdmin && user.rol !== "administrador") {
        const updated = await pool.query(
          "UPDATE users SET rol = 'administrador' WHERE id = $1 RETURNING id, nombre, rol, correo, activo",
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
