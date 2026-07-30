import { pool } from "./db/pool.js";

const COOKIE_NAME = "uid";
const VER_COMO_COOKIE = "ver_como_rol";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // 180 días
const VER_COMO_MAX_AGE_MS = 1000 * 60 * 60 * 4; // 4 horas — es una sesión de prueba, no permanente
const ROLES = new Set(["administrador", "editor", "lector"]);

function cookieOptions(maxAge = MAX_AGE_MS) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    signed: true,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge,
  };
}

// clearCookie no necesita (y Express 5 lo ignora) maxAge — reusar
// cookieOptions() ahí solo generaba un warning de deprecación.
function clearCookieOptions() {
  const { maxAge, ...rest } = cookieOptions();
  return rest;
}

export function setSessionCookie(res, userId) {
  res.cookie(COOKIE_NAME, String(userId), cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
}

// Cuentas habilitadas para "ver como" (probar la app con otro rol sin
// perder de verdad los permisos de administrador). Nombres separados por
// coma, mismo patrón que BOOTSTRAP_ADMIN_NAMES — deliberadamente acotado:
// sin nombres configurados, la función queda inexistente para todos.
function verComoAllowedNames() {
  return String(process.env.VER_COMO_NOMBRES || "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

// Siempre evalúa contra el rol REAL (rolReal si ya se está viendo como otro
// rol, si no rol) — así se puede cambiar de rol de prueba o salir de él
// aunque el rol vigente en este momento no sea administrador.
export function puedeVerComo(user) {
  if (!user) return false;
  const rolReal = user.rolReal || user.rol;
  return rolReal === "administrador" && verComoAllowedNames().includes(user.nombre.toLowerCase());
}

export function setVerComoCookie(res, rol) {
  res.cookie(VER_COMO_COOKIE, rol, cookieOptions(VER_COMO_MAX_AGE_MS));
}

export function clearVerComoCookie(res) {
  res.clearCookie(VER_COMO_COOKIE, clearCookieOptions());
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

  // El rol real nunca se pierde (queda en rolReal) — solo se sustituye
  // req.user.rol para esta request, y solo si la cuenta está habilitada.
  // Así el backend aplica de verdad las restricciones del rol de prueba
  // (no es solo un maquillaje del frontend).
  const verComoRol = req.signedCookies?.[VER_COMO_COOKIE];
  if (req.user && verComoRol && ROLES.has(verComoRol) && puedeVerComo(req.user)) {
    req.user = { ...req.user, rolReal: req.user.rol, rol: verComoRol, viendoComo: true };
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
