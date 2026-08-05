import express from "express";
import { pool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { hashPassword, verifyPassword } from "./passwordHash.js";

const MIN_PASSWORD_LENGTH = 8;

// Freno de fuerza bruta en memoria: alcanza porque este servicio corre en un
// solo proceso (ver docs/plan-pruebas.md, ESC-03) -- no necesita Redis ni
// nada compartido entre instancias mientras eso siga así.
const LOGIN_MAX_INTENTOS = 5;
const LOGIN_BLOQUEO_MS = 15 * 60 * 1000;
const intentosFallidos = new Map();

function loginBloqueado(correo) {
  const estado = intentosFallidos.get(correo);
  if (!estado?.bloqueadoHasta) return false;
  if (estado.bloqueadoHasta > Date.now()) return true;
  intentosFallidos.delete(correo);
  return false;
}

function registrarIntentoFallido(correo) {
  const estado = intentosFallidos.get(correo) || { count: 0, bloqueadoHasta: null };
  estado.count += 1;
  if (estado.count >= LOGIN_MAX_INTENTOS) {
    estado.bloqueadoHasta = Date.now() + LOGIN_BLOQUEO_MS;
  }
  intentosFallidos.set(correo, estado);
}

function registrarIntentoExitoso(correo) {
  intentosFallidos.delete(correo);
}

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
  const password = String(req.body?.password || "");
  if (!correo || !CORREO_RE.test(correo)) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }
  if (!["administrador", "editor", "lector"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (correo, nombre, rol, activo, password_hash, must_change_password)
       VALUES ($1, $2, $3, true, $4, true)
       RETURNING id, nombre, correo, rol, activo, created_at, last_login_at`,
      [correo, nombre || correo, rol, passwordHash]
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
  if (body.password !== undefined) {
    const password = String(body.password || "");
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
      return;
    }
    values.push(await hashPassword(password));
    sets.push(`password_hash = $${values.length}`);
    // La elige un administrador, no la propia persona -- debe cambiarla en
    // su próximo login (a diferencia de POST /internal/change-password,
    // que la persona usa para elegir la suya y sí puede confiar en ella).
    sets.push(`must_change_password = true`);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: "Nada para actualizar (rol, nombre, activo y/o password)" });
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

// La persona elige su propia contraseña (a diferencia del PATCH de arriba,
// que la fija un administrador y por eso vuelve a exigir cambiarla) -- por
// eso esta sí limpia must_change_password. server.js llama esto ya
// autenticado (requireUser en routes/session.js), nunca antes de un login
// válido.
app.post("/internal/change-password", async (req, res) => {
  const id = Number(req.body?.id);
  const password = String(req.body?.password || "");
  if (!id) {
    res.status(400).json({ error: "Falta el id" });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2
       RETURNING id, nombre, correo, rol, activo, must_change_password`,
      [passwordHash, id]
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

// Aprovisionado por un administrador: un correo solo puede iniciar sesión
// si ya tiene una fila en `users` (creada desde Admin.jsx, con contraseña
// asignada ahí) o si está en BOOTSTRAP_ADMIN_EMAILS. Correo no reconocido y
// no bootstrap = 403. BOOTSTRAP_ADMIN_EMAILS (env var, correos separados
// por coma) es el mecanismo de arranque: sin él, nadie podría darse de alta
// a sí mismo como el primer administrador. Se aplica en cada login, no solo
// al crear la cuenta (si se agrega un correo a la lista después de que esa
// cuenta ya existía con otro rol, el próximo login la vuelve a promover).
//
// Contraseña: solución interina hasta integrar CAS/SSO institucional (ver
// 004_users_correo_activo.sql y 005_users_password.sql) -- verificar solo el
// correo dejaba entrar a cualquiera que lo conociera, incluido un admin.
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
  const password = String(req.body?.password || "");
  if (!correo) {
    res.status(400).json({ error: "Falta el correo" });
    return;
  }
  if (!CORREO_RE.test(correo)) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }
  if (!password) {
    res.status(400).json({ error: "Falta la contraseña" });
    return;
  }
  if (loginBloqueado(correo)) {
    res.status(429).json({ error: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo." });
    return;
  }

  try {
    const existing = await pool.query(
      "SELECT id, nombre, rol, correo, activo, password_hash, must_change_password FROM users WHERE correo = $1",
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
      if (password.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
        return;
      }
      const passwordHash = await hashPassword(password);
      const inserted = await pool.query(
        `INSERT INTO users (correo, nombre, rol, activo, password_hash, last_login_at)
         VALUES ($1, $2, 'administrador', true, $3, now())
         RETURNING id, nombre, rol, correo, activo, must_change_password`,
        [correo, nombre || correo, passwordHash]
      );
      registrarIntentoExitoso(correo);
      res.json({ user: inserted.rows[0] });
      return;
    }

    if (!user.activo) {
      res.status(403).json({ error: "Tu cuenta está desactivada. Contacta a un administrador." });
      return;
    }
    if (!user.password_hash) {
      res.status(403).json({
        error: "Tu cuenta todavía no tiene contraseña asignada. Pide a un administrador que te asigne una.",
      });
      return;
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      registrarIntentoFallido(correo);
      res.status(401).json({ error: "Correo o contraseña incorrectos" });
      return;
    }
    registrarIntentoExitoso(correo);

    if (isBootstrapAdmin && user.rol !== "administrador") {
      const updated = await pool.query(
        `UPDATE users SET rol = 'administrador' WHERE id = $1
         RETURNING id, nombre, rol, correo, activo, must_change_password`,
        [user.id]
      );
      user = updated.rows[0];
    }
    await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);

    const { password_hash, ...userSinHash } = user;
    res.json({ user: userSinHash });
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible" });
  }
});

async function start() {
  if (process.env.NODE_ENV === "production" && !process.env.SESION_SECRET) {
    console.error("SESION_SECRET es obligatorio en producción — abortando arranque.");
    process.exit(1);
  }

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
