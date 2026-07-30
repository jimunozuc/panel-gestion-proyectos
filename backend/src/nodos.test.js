// Importar testUtils/db ANTES que cualquier módulo de la app: fija
// DATABASE_URL=TEST_DATABASE_URL antes de que pool.js abra la conexión.
import { pool, setupTestDb, resetDb } from "./testUtils/db.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { importSheetIfEmpty, importAllSheets, loadSheetFromDb } from "./nodos.js";

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

test("importAllSheets importa cada hoja real una vez y salta los alias (no duplica P6.1.3 como 6.2)", async () => {
  await importAllSheets({ "P6.1.3": SHEET, "6.2": SHEET });

  const real = await loadSheetFromDb("P6.1.3");
  assert.equal(real.tree.length, 1);

  const alias = await loadSheetFromDb("6.2");
  assert.equal(alias, null); // nunca se importó bajo esa clave

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM nodos WHERE sheet_id IN ('P6.1.3', '6.2')");
  assert.equal(rows[0].n, 3); // línea + iniciativa + tarea, una sola vez
});

test("importAllSheets sigue con las demás hojas si una falla", async () => {
  const bad = {
    tree: [
      {
        nombre: "X",
        tipo: "Tarea",
        responsable: "",
        inicio: null,
        fin: null,
        avance: 0,
        initiatives: [{ nombre: null, tipo: "Tarea", responsable: "", inicio: null, fin: null, avance: 0 }],
      },
    ],
  };
  await importAllSheets({ SHEET_BAD: bad, SHEET_OK: SHEET });

  assert.equal(await loadSheetFromDb("SHEET_BAD"), null); // falló (nombre NOT NULL), no quedó a medias
  const ok = await loadSheetFromDb("SHEET_OK");
  assert.equal(ok.tree.length, 1); // esta sí se importó, el error de la otra no la bloqueó
});
