import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseWorkbookBuffer } from "./parseWorkbook.js";

// Construye un .xlsx en memoria a partir de una lista de encabezados (en el
// orden que se quiera probar) y filas como objetos {encabezado: valor} — el
// orden real de columnas en el archivo lo decide `headerLabels`, no el orden
// de las claves del objeto.
async function ganttBuffer(sheetName, headerLabels, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headerLabels);
  for (const row of rows) {
    sheet.addRow(headerLabels.map((label) => row[label] ?? null));
  }
  return workbook.xlsx.writeBuffer();
}

async function simpleBuffer(sheetName, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(["Proyecto", "Subproyecto", "Tipo", "Nombre", "Responsable", "Inicio", "Fin"]);
  for (const r of rows) {
    sheet.addRow([r.proyecto, r.subproyecto, r.tipo, r.nombre, r.responsable, r.inicio, r.fin]);
  }
  return workbook.xlsx.writeBuffer();
}

test("ubica las columnas Gantt por nombre de encabezado, no por posición (regresión: se rompió al agregar Responsable)", async () => {
  const row = { Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1", Responsable: "Ana", "% avance": 50 };

  const conResponsableAlFinal = await ganttBuffer(
    "Hoja",
    ["Nivel", "Tipo", "Nombre", "Responsable", "% avance"],
    [row]
  );
  const conResponsableAlMedio = await ganttBuffer(
    "Hoja",
    ["Nivel", "Responsable", "Tipo", "Nombre", "% avance"],
    [row]
  );

  const a = await parseWorkbookBuffer(conResponsableAlFinal);
  const b = await parseWorkbookBuffer(conResponsableAlMedio);

  assert.deepEqual(a.Hoja.tree, b.Hoja.tree);
  assert.deepEqual(a.Hoja.team, b.Hoja.team);
  assert.equal(a.Hoja.tree[0].nombre, "Línea 1");
  assert.equal(a.Hoja.tree[0].responsable, "Ana");
});

test("Tipo distinto de \"Hito\" se normaliza a \"Tarea\"", async () => {
  const buf = await ganttBuffer(
    "Hoja",
    ["Nivel", "Tipo", "Nombre"],
    [{ Nivel: 1, Tipo: "Actividad", Nombre: "Línea 1" }]
  );
  const { Hoja } = await parseWorkbookBuffer(buf);
  assert.equal(Hoja.tree[0].tipo, "Tarea");
});

test("un nivel 3 sin nivel 2 contenedor se muestra como iniciativa propia sin actividades", async () => {
  const buf = await ganttBuffer(
    "Hoja",
    ["Nivel", "Tipo", "Nombre"],
    [
      { Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" },
      { Nivel: 3, Tipo: "Hito", Nombre: "Hito suelto" },
    ]
  );
  const { Hoja } = await parseWorkbookBuffer(buf);
  assert.equal(Hoja.tree[0].initiatives.length, 1);
  assert.equal(Hoja.tree[0].initiatives[0].nombre, "Hito suelto");
  assert.deepEqual(Hoja.tree[0].initiatives[0].activities, []);
});

test("parseSimpleSheet agrupa por proyecto/subproyecto y arma actividades cuando hay más de una fila", async () => {
  const buf = await simpleBuffer("Hoja", [
    { proyecto: "P1", subproyecto: "Sub1", tipo: "Tarea", nombre: "Act 1", responsable: "Ana", inicio: null, fin: null },
    { proyecto: "P1", subproyecto: "Sub1", tipo: "Hito", nombre: "Act 2", responsable: "Ana", inicio: null, fin: null },
  ]);
  const { Hoja } = await parseWorkbookBuffer(buf);
  assert.equal(Hoja.tree.length, 1);
  assert.equal(Hoja.tree[0].nombre, "P1");
  assert.equal(Hoja.tree[0].initiatives[0].nombre, "Sub1");
  assert.equal(Hoja.tree[0].initiatives[0].activities.length, 2);
});

test("una hoja Gantt aliaseada (P6.1.3) queda disponible también bajo su alias 6.2", async () => {
  const buf = await ganttBuffer("P6.1.3", ["Nivel", "Tipo", "Nombre"], [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);
  const result = await parseWorkbookBuffer(buf);
  assert.ok(result["6.2"]);
  assert.deepEqual(result["6.2"], result["P6.1.3"]);
});

test("la hoja \"Listas\" se omite del resultado", async () => {
  const buf = await simpleBuffer("Listas", [
    { proyecto: "X", subproyecto: "", tipo: "Tarea", nombre: "X", responsable: "", inicio: null, fin: null },
  ]);
  const result = await parseWorkbookBuffer(buf);
  assert.equal(result.Listas, undefined);
});
