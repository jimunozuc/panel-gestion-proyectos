import { Router } from "express";
import { pool } from "../db/pool.js";
import { setSessionCookie, clearSessionCookie, puedeVerComo, setVerComoCookie, clearVerComoCookie } from "../session.js";
import { sesionFetch } from "../sesionClient.js";

export const sessionRouter = Router();

sessionRouter.get("/session", (req, res) => {
  res.json({ user: req.user, puedeVerComo: puedeVerComo(req.user) });
});

sessionRouter.get("/users", async (req, res) => {
  try {
    const users = await sesionFetch("/internal/users");
    res.json(users);
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

sessionRouter.post("/session/login", async (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  if (!nombre) {
    res.status(400).json({ error: "Falta el nombre" });
    return;
  }
  try {
    const { user } = await sesionFetch("/internal/login", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    });
    setSessionCookie(res, user.id);
    res.json({ user, puedeVerComo: puedeVerComo(user) });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

sessionRouter.post("/session/logout", (req, res) => {
  clearSessionCookie(res);
  clearVerComoCookie(res);
  res.json({ ok: true });
});

// "Ver como": solo para cuentas habilitadas por VER_COMO_NOMBRES (ver
// session.js). Cambia de verdad el rol que aplica el backend en esta
// sesión (no es un maquillaje del frontend) — por eso queda auditado.
sessionRouter.post("/session/ver-como", async (req, res) => {
  if (!puedeVerComo(req.user)) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }
  const rol = req.body?.rol;
  if (!["administrador", "editor", "lector"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  setVerComoCookie(res, rol);
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_nombre, entity_type, accion, campo, valor_nuevo)
       VALUES ($1,$2,'sesion','ver_como','rol',$3)`,
      [req.user.id, req.user.nombre, rol]
    );
  } catch {
    // La bitácora no debe bloquear el cambio de vista de prueba si falla.
  }
  res.json({ ok: true, rol });
});

sessionRouter.post("/session/ver-como/salir", async (req, res) => {
  clearVerComoCookie(res);
  res.json({ ok: true });
});
