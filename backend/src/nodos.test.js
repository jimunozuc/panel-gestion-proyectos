// Importar testUtils/db ANTES que cualquier módulo de la app: fija
// DATABASE_URL=TEST_DATABASE_URL antes de que pool.js abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { importSheetIfEmpty, loadSheetFromDb } from "./nodos.js";

before(setupTestDb);
beforeEach(resetDb);

const SHEET = {
  tree: [
    {
      nombre: "Línea 1",
      tipo: "Tarea",
      responsable: "Ana",
      inicio: null,
      fin: null,
      avance: 0,
      initiatives: [
        {
          nombre: "Iniciativa 1",
          tipo: "Tarea",
          responsable: "Ana",
          inicio: null,
          fin: null,
          avance: 0,
          activities: [
            { nombre: "Tarea 1", tipo: "Tarea", responsable: "Ana", inicio: null, fin: null, avance: 50 },
          ],
        },
      ],
    },
  ],
};

test("importSheetIfEmpty copia el árbol completo la primera vez", async () => {
  const inserted = await importSheetIfEmpty("SHEET_X", SHEET);
  assert.equal(inserted, true);

  const loaded = await loadSheetFromDb("SHEET_X");
  assert.equal(loaded.tree.length, 1);
  assert.equal(loaded.tree[0].initiatives[0].activities[0].nombre, "Tarea 1");
  assert.deepEqual(loaded.team, ["Ana"]);
});

test("importSheetIfEmpty no reimporta una segunda vez", async () => {
  await importSheetIfEmpty("SHEET_X", SHEET);
  const secondCall = await importSheetIfEmpty("SHEET_X", SHEET);
  assert.equal(secondCall, false);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM nodos WHERE sheet_id = $1", ["SHEET_X"]);
  assert.equal(rows[0].n, 3); // línea + iniciativa + tarea, no duplicado
});

test("borrar todos los nodos de una hoja hasta cero no la reimporta sola (regresión PR #17)", async () => {
  await importSheetIfEmpty("SHEET_Y", SHEET);
  await pool.query("DELETE FROM nodos WHERE sheet_id = $1", ["SHEET_Y"]);

  const reimported = await importSheetIfEmpty("SHEET_Y", SHEET);
  assert.equal(reimported, false);
  assert.equal(await loadSheetFromDb("SHEET_Y"), null);
});

test("loadSheetFromDb devuelve null si la hoja no tiene filas", async () => {
  assert.equal(await loadSheetFromDb("NOPE"), null);
});
