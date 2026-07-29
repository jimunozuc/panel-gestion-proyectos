import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireEditor } from "../session.js";
import { isoDate } from "../nodos.js";

export const nodosRouter = Router();

const EDITABLE_FIELDS = ["nombre", "tipo", "responsable", "inicio", "fin", "avance"];

async function logAudit(client, { userId, userNombre, entityId, sheetId, campo, anterior, nuevo, accion }) {
  await client.query(
    `INSERT INTO audit_log (user_id, user_nombre, entity_type, entity_id, sheet_id, campo, valor_anterior, valor_nuevo, accion)
     VALUES ($1,$2,'nodo',$3,$4,$5,$6,$7,$8)`,
    [userId, userNombre, entityId, sheetId, campo || null, anterior ?? null, nuevo ?? null, accion]
  );
}

nodosRouter.post("/iniciativas/:num/nodos", requireEditor, async (req, res) => {
  const sheetId = req.params.num;
  const { parentId = null, nombre, tipo = "Tarea", responsable = "", inicio = null, fin = null, avance = 0 } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    res.status(400).json({ error: "Falta el nombre" });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    let nivel = 1;
    if (parentId) {
      const { rows } = await client.query("SELECT nivel FROM nodos WHERE id = $1", [parentId]);
      if (!rows[0]) throw new Error("El nodo padre no existe");
      nivel = rows[0].nivel + 1;
    }

    const { rows: orderRows } = await client.query(
      "SELECT coalesce(max(orden), -1) + 1 AS orden FROM nodos WHERE sheet_id = $1 AND parent_id IS NOT DISTINCT FROM $2",
      [sheetId, parentId]
    );

    const { rows } = await client.query(
      `INSERT INTO nodos (sheet_id, parent_id, nivel, orden, nombre, tipo, responsable, inicio, fin, avance, origen, editado_manualmente, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'manual', true, $11)
       RETURNING id`,
      [sheetId, parentId, nivel, orderRows[0].orden, nombre.trim(), tipo, responsable, inicio, fin, avance, req.user.id]
    );
    const id = rows[0].id;

    await logAudit(client, {
      userId: req.user.id,
      userNombre: req.user.nombre,
      entityId: id,
      sheetId,
      nuevo: nombre.trim(),
      accion: "crear",
    });

    await client.query("COMMIT");
    res.status(201).json({ id });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    res.status(400).json({ error: err.message });
  } finally {
    client?.release();
  }
});

nodosRouter.patch("/nodos/:id", requireEditor, async (req, res) => {
  const id = Number(req.params.id);
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { rows } = await client.query("SELECT * FROM nodos WHERE id = $1 FOR UPDATE", [id]);
    const current = rows[0];
    if (!current) {
      res.status(404).json({ error: "No existe" });
      await client.query("ROLLBACK");
      return;
    }

    const changes = [];
    const setClauses = [];
    const values = [];
    let i = 1;
    for (const field of EDITABLE_FIELDS) {
      if (!(field in req.body)) continue;
      const anteriorRaw = current[field];
      const anterior = field === "inicio" || field === "fin" ? isoDate(anteriorRaw) : anteriorRaw;
      const nuevo = req.body[field] === "" ? null : req.body[field];
      if (String(anterior ?? "") === String(nuevo ?? "")) continue;
      changes.push({ campo: field, anterior, nuevo });
      setClauses.push(`${field} = $${i++}`);
      values.push(nuevo);
    }

    if (!changes.length) {
      await client.query("ROLLBACK");
      res.json({ ok: true, changes: [] });
      return;
    }

    setClauses.push(`editado_manualmente = true`, `updated_by = $${i++}`, `updated_at = now()`);
    values.push(req.user.id, id);
    await client.query(`UPDATE nodos SET ${setClauses.join(", ")} WHERE id = $${i}`, values);

    for (const c of changes) {
      await logAudit(client, {
        userId: req.user.id,
        userNombre: req.user.nombre,
        entityId: id,
        sheetId: current.sheet_id,
        campo: c.campo,
        anterior: c.anterior,
        nuevo: c.nuevo,
        accion: "editar",
      });
    }

    await client.query("COMMIT");
    res.json({ ok: true, changes });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    res.status(400).json({ error: err.message });
  } finally {
    client?.release();
  }
});

nodosRouter.delete("/nodos/:id", requireEditor, async (req, res) => {
  const id = Number(req.params.id);
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { rows } = await client.query("SELECT * FROM nodos WHERE id = $1", [id]);
    const current = rows[0];
    if (!current) {
      res.status(404).json({ error: "No existe" });
      await client.query("ROLLBACK");
      return;
    }

    await client.query("DELETE FROM nodos WHERE id = $1", [id]);
    await logAudit(client, {
      userId: req.user.id,
      userNombre: req.user.nombre,
      entityId: id,
      sheetId: current.sheet_id,
      anterior: current.nombre,
      accion: "eliminar",
    });

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    res.status(400).json({ error: err.message });
  } finally {
    client?.release();
  }
});
