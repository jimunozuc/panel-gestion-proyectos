import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../session.js";

export const adminRouter = Router();

adminRouter.get("/audit-log", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_nombre, entity_type, entity_id, sheet_id, campo, valor_anterior, valor_nuevo, accion, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
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
