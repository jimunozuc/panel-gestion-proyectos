import ExcelJS from "exceljs";

const COLUMNS = ["proyecto", "subproyecto", "tipo", "nombre", "responsable", "inicio", "fin"];

// El sheet "P6.1.3" (Gantt real, sin columna Responsable) representa hoy la
// única iniciativa habilitada en el frontend ("6.2"). Ver README, sección
// "Origen de datos".
const SHEET_ALIASES = { "P6.1.3": "6.2" };
const SKIP_SHEETS = new Set(["Listas"]);
const GANTT_HEADERS = ["Nivel", "Tipo", "Etiqueta (solo si es hito)", "Nombre", "Inicio", "Fin", "% avance"];

function toIsoDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function computeAvance(inicio, fin, today) {
  const start = inicio ? new Date(inicio) : null;
  const end = fin ? new Date(fin) : start;
  const s = start || end;
  const e = end || start;
  if (!s || !e) return 0;
  if (today < s) return 0;
  if (today >= e) return 100;
  const total = e - s;
  if (total <= 0) return 100;
  const pct = Math.round(((today - s) / total) * 100);
  return Math.min(99, Math.max(1, pct));
}

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

// --- Formato simple: una fila por Proyecto | Subproyecto | Tipo | Nombre |
// Responsable | Fecha inicio | Fecha limite (archivo de ejemplo / dev local) ---

function sheetRows(worksheet) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1, 8);
    const [proyecto, subproyecto, tipo, nombre, responsable, inicio, fin] = values;
    if (!proyecto) return;
    rows.push({
      proyecto: String(proyecto).trim(),
      subproyecto: String(subproyecto || "").trim(),
      tipo: String(tipo || "").trim(),
      nombre: String(nombre || "").trim(),
      responsable: String(responsable || "").trim(),
      inicio: toIsoDate(inicio),
      fin: toIsoDate(fin),
    });
  });
  return rows;
}

function buildSimpleTree(rows, today, nextRowId) {
  const proyectoOrder = [];
  const byProyecto = new Map();
  for (const r of rows) {
    if (!byProyecto.has(r.proyecto)) {
      byProyecto.set(r.proyecto, []);
      proyectoOrder.push(r.proyecto);
    }
    byProyecto.get(r.proyecto).push(r);
  }

  const tree = proyectoOrder.map((proyectoNombre) => {
    const proyectoRows = byProyecto.get(proyectoNombre);
    const subOrder = [];
    const bySub = new Map();
    for (const r of proyectoRows) {
      if (!bySub.has(r.subproyecto)) {
        bySub.set(r.subproyecto, []);
        subOrder.push(r.subproyecto);
      }
      bySub.get(r.subproyecto).push(r);
    }

    const initiatives = subOrder.map((subNombre) => {
      const subRows = bySub.get(subNombre);
      const isStandalone = subRows.length === 1 && subRows[0].nombre === subNombre;

      if (isStandalone) {
        const r = subRows[0];
        const avance = computeAvance(r.inicio, r.fin, today);
        return {
          row: nextRowId(),
          nombre: subNombre,
          tipo: r.tipo === "Hito" ? "Hito" : "Tarea",
          responsable: r.responsable,
          inicio: r.inicio,
          fin: r.fin,
          avance,
          activities: [],
        };
      }

      const activities = subRows.map((r) => ({
        row: nextRowId(),
        nombre: r.nombre,
        tipo: r.tipo === "Hito" ? "Hito" : "Tarea",
        responsable: r.responsable,
        inicio: r.inicio,
        fin: r.fin,
        avance: computeAvance(r.inicio, r.fin, today),
      }));
      const inicios = activities.map((a) => a.inicio).filter(Boolean).sort();
      const fines = activities.map((a) => a.fin).filter(Boolean).sort();
      const responsables = [...new Set(activities.map((a) => a.responsable).filter(Boolean))];

      return {
        row: nextRowId(),
        nombre: subNombre,
        tipo: "Tarea",
        responsable: responsables.length === 1 ? responsables[0] : "",
        inicio: inicios[0] || null,
        fin: fines[fines.length - 1] || null,
        avance: avg(activities.map((a) => a.avance)),
        activities,
      };
    });

    const inicios = initiatives.map((i) => i.inicio).filter(Boolean).sort();
    const fines = initiatives.map((i) => i.fin).filter(Boolean).sort();

    return {
      row: nextRowId(),
      nombre: proyectoNombre,
      tipo: "Tarea",
      inicio: inicios[0] || null,
      fin: fines[fines.length - 1] || null,
      avance: avg(initiatives.map((i) => i.avance)),
      initiatives,
    };
  });

  return tree;
}

function parseSimpleSheet(worksheet, today) {
  const rows = sheetRows(worksheet);
  let counter = 0;
  const nextRowId = () => ++counter;
  const tree = buildSimpleTree(rows, today, nextRowId);
  const team = [...new Set(rows.map((r) => r.responsable).filter(Boolean))];
  return { team, tree };
}

// --- Formato Gantt real: metadata en filas superiores, luego encabezado
// Nivel | Tipo | Etiqueta (solo si es hito) | Nombre | Inicio | Fin | % avance
// | <meses...>. Nivel 1 = línea, Nivel 2 = iniciativa, Nivel 3 = actividad/hito.
// No trae columna Responsable. ---

function findGanttHeaderRow(worksheet) {
  for (let r = 1; r <= Math.min(20, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const cell1 = String(row.getCell(1).value || "").trim();
    const cell2 = String(row.getCell(2).value || "").trim();
    if (cell1 === "Nivel" && cell2 === "Tipo") return r;
  }
  return null;
}

function isGanttSheet(worksheet) {
  return findGanttHeaderRow(worksheet) != null;
}

function buildGanttTree(worksheet, headerRow) {
  const tree = [];
  let currentLinea = null;
  let currentIniciativa = null;

  for (let r = headerRow + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const nivel = Number(row.getCell(1).value);
    const tipoRaw = String(row.getCell(2).value || "").trim();
    const nombre = String(row.getCell(4).value || "").trim();
    if (!nivel || !nombre) continue;

    const tipo = tipoRaw === "Hito" ? "Hito" : "Tarea";
    const inicio = toIsoDate(row.getCell(5).value);
    const fin = toIsoDate(row.getCell(6).value);
    const avanceRaw = row.getCell(7).value;
    const avance = typeof avanceRaw === "number" ? Math.round(avanceRaw) : 0;
    const node = { row: r, nombre, tipo, responsable: "", inicio, fin, avance };

    if (nivel === 1) {
      currentLinea = { ...node, initiatives: [] };
      tree.push(currentLinea);
      currentIniciativa = null;
    } else if (nivel === 2 && currentLinea) {
      currentIniciativa = { ...node, activities: [] };
      currentLinea.initiatives.push(currentIniciativa);
    } else if (nivel === 3 && currentLinea) {
      if (currentIniciativa) {
        currentIniciativa.activities.push(node);
      } else {
        // Actividad/hito sin iniciativa (Nivel 2) contenedora: se muestra
        // como iniciativa propia sin actividades hijas.
        currentLinea.initiatives.push({ ...node, activities: [] });
      }
    }
  }

  return tree;
}

function parseGanttSheet(worksheet) {
  const headerRow = findGanttHeaderRow(worksheet);
  const tree = buildGanttTree(worksheet, headerRow);
  return { team: [], tree };
}

export async function parseWorkbookBuffer(buffer, { today = new Date() } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result = {};
  for (const worksheet of workbook.worksheets) {
    if (SKIP_SHEETS.has(worksheet.name)) continue;

    const parsed = isGanttSheet(worksheet)
      ? parseGanttSheet(worksheet)
      : parseSimpleSheet(worksheet, today);

    result[worksheet.name] = parsed;
    const alias = SHEET_ALIASES[worksheet.name];
    if (alias) result[alias] = parsed;
  }
  return result;
}

export { COLUMNS };
