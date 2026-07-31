import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../session.js";
import { sesionFetch } from "../sesionClient.js";

export const adminRouter = Router();

adminRouter.get("/audit-log", requireAdmin, async (req, res) => {
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

// Reutiliza audit_log (entity_type='proyecto_solicitud') en vez de crear una
// tabla nueva: el alta real en frontend/src/data/plan.js la sigue haciendo
// un humano cuando la hoja tenga datos reales (ver CLAUDE.md, "no inventar
// datos") — esto solo deja la solicitud registrada para esa revisión.
adminRouter.post("/admin/proyecto-solicitudes", requireAdmin, async (req, res) => {
  const { ejeId, iniciativaId, nombre, responsable = "", descripcion = "" } = req.body || {};
  if (!ejeId || !iniciativaId || !nombre || !String(nombre).trim()) {
    res.status(400).json({ error: "Faltan datos obligatorios (objetivo, iniciativa y nombre)" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (user_id, user_nombre, entity_type, entity_id, sheet_id, campo, valor_nuevo, accion)
       VALUES ($1,$2,'proyecto_solicitud',NULL,$3,$4,$5,'solicitud')
       RETURNING id`,
      [
        req.user.id,
        req.user.nombre,
        String(iniciativaId),
        nombre.trim(),
        JSON.stringify({ ejeId, iniciativaId, nombre: nombre.trim(), responsable, descripcion }),
      ]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delega a sesionServer.js (servicio aparte): dueño real de usuarios/roles
// y de "última conexión"/"última acción" (ver README ## Microservicios).
adminRouter.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await sesionFetch("/internal/admin/users");
    res.json(users);
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

// Da de alta una cuenta ANTES de su primer login — el admin decide
// correo+rol de antemano (ver sesionServer.js, ya no hay creación
// automática al loguearse con un correo desconocido).
adminRouter.post("/admin/users", requireAdmin, async (req, res) => {
  const correo = String(req.body?.correo || "").trim();
  const nombre = String(req.body?.nombre || "").trim();
  const rol = req.body?.rol;
  if (!correo) {
    res.status(400).json({ error: "Falta el correo" });
    return;
  }
  if (!["administrador", "editor", "lector"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  try {
    const user = await sesionFetch("/internal/admin/users", {
      method: "POST",
      body: JSON.stringify({ correo, nombre, rol }),
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

// rol, nombre y activo son independientes — el body trae solo los campos
// que cambian (ej. el toggle de activo no reenvía el rol).
adminRouter.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (body.rol !== undefined) {
    if (!["administrador", "editor", "lector"].includes(body.rol)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    patch.rol = body.rol;
  }
  if (body.nombre !== undefined) {
    patch.nombre = body.nombre;
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== "boolean") {
      res.status(400).json({ error: "activo debe ser boolean" });
      return;
    }
    patch.activo = body.activo;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nada para actualizar" });
    return;
  }
  try {
    const user = await sesionFetch(`/internal/admin/users/${Number(req.params.id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    res.json(user);
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});
