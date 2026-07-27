import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../session.js";

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

adminRouter.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, nombre, rol, created_at FROM users ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.patch("/admin/users/:id", requireAdmin, async (req, res) => {
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
