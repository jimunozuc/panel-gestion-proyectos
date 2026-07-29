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
// importar, así que una hoja migrada nunca pierde ediciones manuales por un
// refresh posterior.
//
// El check es contra `imported_sheets`, no contra "¿nodos tiene filas hoy?"
// — si fuera esto último, borrar todos los nodos de una hoja hasta dejarla
// en cero haría que el próximo GET la reimportara sola desde el Excel,
// devolviendo datos que alguien borró a propósito.
export async function importSheetIfEmpty(sheetId, sheet) {
  const { rows } = await pool.query("SELECT 1 FROM imported_sheets WHERE sheet_id = $1", [sheetId]);
  if (rows.length) return false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await insertLevel(client, sheetId, sheet.tree, null, 1);
    await client.query(
      "INSERT INTO imported_sheets (sheet_id) VALUES ($1) ON CONFLICT (sheet_id) DO NOTHING",
      [sheetId]
    );
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
  // Fecha real de la última edición de esta hoja. Una hoja que vive en
  // Postgres ya no depende del Excel, así que la fecha del cache en memoria
  // no dice nada de ella (puede venir del sample local horneado en la
  // imagen). updated_at se refresca en cada PATCH, ver routes/nodos.js.
  let updatedAt = null;

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
    if (r.updated_at && (!updatedAt || r.updated_at > updatedAt)) updatedAt = r.updated_at;
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

  return { team, tree: roots, updatedAt };
}
