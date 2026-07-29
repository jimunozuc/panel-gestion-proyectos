import { Router } from "express";
import { pool } from "../db/pool.js";
import { setSessionCookie, clearSessionCookie } from "../session.js";

export const sessionRouter = Router();

sessionRouter.get("/session", (req, res) => {
  res.json({ user: req.user });
});

sessionRouter.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, rol FROM users ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible" });
  }
});

// Sin contraseña: si el nombre no existe se crea al vuelo. El primer
// usuario que se registra en todo el sistema queda como administrador
// (para poder entrar a la vista admin sin tener que inventar un usuario de
// ejemplo); el resto entra como editor y un administrador le cambia el rol
// después desde la vista admin.
//
// BOOTSTRAP_ADMIN_NAMES (env var, nombres separados por coma) cubre el caso
// en que la regla "primer usuario = admin" no alcanza: un usuario de prueba
// ya ocupó ese cupo en un entorno (ej. /app/), o el entorno es nuevo y hay
// que garantizar que una persona puntual quede admin sin tocar la base a
// mano. Se aplica en cada login, no solo al crear el usuario, así que
// también promueve a alguien que ya existía como editor/lector.
function bootstrapAdminNames() {
  return String(process.env.BOOTSTRAP_ADMIN_NAMES || "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

sessionRouter.post("/session/login", async (req, res) => {
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
        "INSERT INTO users (nombre, rol) VALUES ($1, $2) RETURNING id, nombre, rol",
        [nombre, rol]
      );
      user = inserted.rows[0];
    } else if (isBootstrapAdmin && user.rol !== "administrador") {
      const updated = await pool.query(
        "UPDATE users SET rol = 'administrador' WHERE id = $1 RETURNING id, nombre, rol",
        [user.id]
      );
      user = updated.rows[0];
    }

    setSessionCookie(res, user.id);
    res.json({ user });
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible" });
  }
});

sessionRouter.post("/session/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
