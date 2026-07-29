import { pool } from "./db/pool.js";

const COOKIE_NAME = "uid";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // 180 días

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    signed: true,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: MAX_AGE_MS,
  };
}

export function setSessionCookie(res, userId) {
  res.cookie(COOKIE_NAME, String(userId), cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export async function attachUser(req, res, next) {
  const uid = req.signedCookies?.[COOKIE_NAME];
  if (!uid) {
    req.user = null;
    next();
    return;
  }
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, rol FROM users WHERE id = $1",
      [uid]
    );
    req.user = rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Se requiere iniciar sesión" });
    return;
  }
  next();
}

// A diferencia de requireUser, excluye a los lectores: el rol lector es
// deliberadamente de solo lectura, no puede crear/editar/eliminar nodos.
export function requireEditor(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Se requiere iniciar sesión" });
    return;
  }
  if (req.user.rol === "lector") {
    res.status(403).json({ error: "Tu rol (lector) no permite editar" });
    return;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== "administrador") {
    res.status(403).json({ error: "Requiere rol administrador" });
    return;
  }
  next();
}
