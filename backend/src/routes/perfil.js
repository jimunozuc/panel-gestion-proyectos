import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireUser } from "../session.js";

export const perfilRouter = Router();

// Resumen por persona a través de todas las hojas reales — mismo criterio
// que ya usa Seguimiento.jsx para "Carga por responsable", pero acotado al
// usuario de la sesión actual: pendiente = avance < 100, hito realizado =
// avance = 100, proyecto activo = tiene al menos una tarea/hito sin cerrar
// en esa hoja.
perfilRouter.get("/perfil/resumen", requireUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT sheet_id, tipo, avance FROM nodos WHERE responsable = $1",
      [req.user.nombre]
    );

    let tareasPendientes = 0;
    let hitosRealizados = 0;
    const proyectosActivos = new Set();

    for (const r of rows) {
      const pendiente = (r.avance ?? 0) < 100;
      if (r.tipo === "Tarea" && pendiente) tareasPendientes++;
      if (r.tipo === "Hito" && !pendiente) hitosRealizados++;
      if (pendiente) proyectosActivos.add(r.sheet_id);
    }

    res.json({
      nombre: req.user.nombre,
      rol: req.user.rol,
      tareasPendientes,
      proyectosActivos: proyectosActivos.size,
      hitosRealizados,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
