const MONTH_ABBR = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const UC = {
  azul: "#0176DE",
  amarillo: "#FEC60D",
  cel: "#66B3FF",
  navy: "#173F8A",
  verde: "#7BB87B",
  negro: "#03122E",
};

export const PERSON_COLORS = [
  UC.azul, "#00867A", "#D10068", UC.navy, "#D58D00", "#7A3E9D", "#0354B1",
];

const LINE_META = {
  "Proyectos IA": { c: UC.azul, soft: "#E3F0FB", label: "Proyectos IA" },
  "Chatbots institucionales": { c: UC.navy, soft: "#E1E8F4", label: "Chatbots institucionales" },
  "Gobernanza y operación de UC Bots": { c: "#D10068", soft: "#FBE3ED", label: "Gobernanza y operación" },
  "POC Arquitectura de Orquestación": { c: "#D58D00", soft: "#FBF0DC", label: "Arquitectura de orquestación" },
  "Selección y adopción de IAs Gen": { c: "#00867A", soft: "#DAF1EE", label: "Selección y adopción de IA Gen" },
};

export const lineMeta = (n) => LINE_META[n] || { c: "#475569", soft: "#F1F5F9", label: n };

export const STATUS_META = {
  completada: { label: "Completada", c: "#00870A", soft: "#E2FDE2" },
  en_curso: { label: "En curso", c: UC.azul, soft: "#E3F0FB" },
  pendiente: { label: "Pendiente", c: "#707070", soft: "#EFF1F3" },
};

export function statusOf(av) {
  const n = Number(av) || 0;
  if (n >= 100) return "completada";
  if (n > 0) return "en_curso";
  return "pendiente";
}

export function personColor(name, team) {
  const i = team.indexOf(name);
  return i >= 0 ? PERSON_COLORS[i % PERSON_COLORS.length] : "#93A6B8";
}

export function initials(name) {
  if (!name) return "—";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function monthName(midx, epochYear) {
  const y = epochYear + Math.floor(midx / 12);
  const mo = ((midx % 12) + 12) % 12;
  return `${MONTH_ABBR[mo]} ${y}`;
}

const MONTH_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthLong(midx, epochYear) {
  const y = epochYear + Math.floor(midx / 12);
  const mo = ((midx % 12) + 12) % 12;
  const name = MONTH_LONG[mo];
  return `${name[0].toUpperCase()}${name.slice(1)} de ${y}`;
}

export function allInitiatives(tree) {
  const r = [];
  tree.forEach((g) => g.initiatives.forEach((i) => r.push({ ...i, line: g.nombre })));
  return r;
}

export function buildMonthGrid(tree) {
  const dates = [];
  function walk(n) {
    if (n.inicio) dates.push(n.inicio);
    if (n.fin) dates.push(n.fin);
  }
  tree.forEach((g) => {
    walk(g);
    g.initiatives.forEach((i) => {
      walk(i);
      i.activities.forEach(walk);
    });
  });

  if (!dates.length) {
    return { epochYear: 2026, months: [], monthIndexOf: () => null };
  }

  const epochYear = Math.min(...dates.map((d) => Number(d.slice(0, 4))));
  const monthIndexOf = (iso) =>
    iso == null ? null : (Number(iso.slice(0, 4)) - epochYear) * 12 + (Number(iso.slice(5, 7)) - 1);
  const maxIndex = Math.max(...dates.map(monthIndexOf));
  const months = Array.from({ length: maxIndex + 1 }, (_, idx) => monthName(idx, epochYear));

  return { epochYear, months, monthIndexOf };
}

export function allNodes(tree) {
  const r = [];
  tree.forEach((g) =>
    g.initiatives.forEach((i) => {
      r.push({ ...i, line: g.nombre, kind: "init", responsable: i.responsable || "" });
      i.activities.forEach((a) =>
        r.push({ ...a, line: g.nombre, kind: "act", parent: i.nombre, responsable: a.responsable || "" })
      );
    })
  );
  return r;
}

export function summarizeTree(tree) {
  const nodes = allNodes(tree);
  const leaves = nodes.filter(
    (n) => n.kind === "act" || (n.kind === "init" && (!n.activities || !n.activities.length))
  );
  const hitos = nodes.filter((n) => n.tipo === "Hito");
  const avance = leaves.length
    ? Math.round(leaves.reduce((s, n) => s + (Number(n.avance) || 0), 0) / leaves.length)
    : 0;
  const hitosDone = hitos.filter((h) => statusOf(h.avance) === "completada").length;
  return { avance, taskCount: leaves.length, hitosDone, hitosTotal: hitos.length };
}
