import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { getData, refreshFromUpload } from "./dataSource.js";

async function ganttBuffer(sheetName, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(["Nivel", "Tipo", "Nombre"]);
  for (const r of rows) sheet.addRow([r.Nivel, r.Tipo, r.Nombre]);
  return workbook.xlsx.writeBuffer();
}

test("getData() carga el Excel de ejemplo local hasta el primer refresh; refreshFromUpload reemplaza el cache", async () => {
  const initial = await getData();
  assert.equal(initial.source, "local-fallback");
  assert.ok(initial.sheets);

  const buf = await ganttBuffer("HojaX", [{ Nivel: 1, Tipo: "Tarea", Nombre: "Línea 1" }]);
  const refreshed = await refreshFromUpload(buf);
  assert.equal(refreshed.source, "power-automate");
  assert.equal(refreshed.sheets.HojaX.tree[0].nombre, "Línea 1");

  // getData() ya no vuelve a leer el fallback local una vez que hay un refresh real.
  const again = await getData();
  assert.equal(again.source, "power-automate");
  assert.equal(again.sheets.HojaX.tree[0].nombre, "Línea 1");
});
