import { pool } from "./db/pool.js";

export function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function insertLevel(client, sheetId, nodes, parentId, nivel) {
  let orden = 0;
  for (const n of nodes) {
    const { rows } = await client.query(
      `INSERT INTO nodos (sheet_id, parent_id, nivel, orden, nombre, tipo, responsable, inicio, fin, avance, origen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'excel')
       RETURNING id`,
      [sheetId, parentId, nivel, orden++, n.nombre, n.tipo, n.responsable || "", n.inicio, n.fin, n.avance || 0]
    );
    const id = rows[0].id;
    if (n.initiatives?.length) await insertLevel(client, sheetId, n.initiatives, id, nivel + 1);
    if (n.activities?.length) await insertLevel(client, sheetId, n.activities, id, nivel + 1);
  }
}

// La primera lectura de una hoja copia su árbol completo a Postgres. De ahí
// en adelante esta tabla manda para esa hoja: el webhook de Excel sigue
// refrescando el cache en memoria, pero esta función ya no vuelve a
// importar (ver el "if (rows.length) return false"), así que una hoja
// migrada nunca pierde ediciones manuales por un refresh posterior.
export async function importSheetIfEmpty(sheetId, sheet) {
  const { rows } = await pool.query("SELECT 1 FROM nodos WHERE sheet_id = $1 LIMIT 1", [sheetId]);
  if (rows.length) return false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await insertLevel(client, sheetId, sheet.tree, null, 1);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return true;
}

export async function loadSheetFromDb(sheetId) {
  const { rows } = await pool.query(
    "SELECT * FROM nodos WHERE sheet_id = $1 ORDER BY nivel, orden",
    [sheetId]
  );
  if (!rows.length) return null;

  const nodeById = new Map();
  const roots = [];
  const team = [];
  const seen = new Set();

  for (const r of rows) {
    const node = {
      row: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      responsable: r.responsable || "",
      inicio: isoDate(r.inicio),
      fin: isoDate(r.fin),
      avance: r.avance,
    };
    if (node.responsable && !seen.has(node.responsable)) {
      seen.add(node.responsable);
      team.push(node.responsable);
    }
    nodeById.set(r.id, node);
  }

  for (const r of rows) {
    const node = nodeById.get(r.id);
    if (r.nivel === 1) {
      node.initiatives = [];
      roots.push(node);
    } else if (r.nivel === 2) {
      node.activities = [];
      nodeById.get(r.parent_id)?.initiatives.push(node);
    } else {
      nodeById.get(r.parent_id)?.activities.push(node);
    }
  }

  return { team, tree: roots };
}
