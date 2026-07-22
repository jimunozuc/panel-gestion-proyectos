import ExcelJS from "exceljs";

const COLUMNS = ["proyecto", "subproyecto", "tipo", "nombre", "responsable", "inicio", "fin"];

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

function buildTree(rows, today, nextRowId) {
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

export async function parseWorkbookBuffer(buffer, { today = new Date() } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result = {};
  for (const worksheet of workbook.worksheets) {
    const rows = sheetRows(worksheet);
    let counter = 0;
    const nextRowId = () => ++counter;
    const tree = buildTree(rows, today, nextRowId);
    const team = [...new Set(rows.map((r) => r.responsable).filter(Boolean))];
    result[worksheet.name] = { team, tree };
  }
  return result;
}

export { COLUMNS };
