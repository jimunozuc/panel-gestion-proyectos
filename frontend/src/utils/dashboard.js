import projectData from "../data/projectData.json";

export const TEAM = projectData.team;
export const MONTHS = projectData.months;
export const TREE = projectData.tree;

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

export function personColor(name) {
  const i = TEAM.indexOf(name);
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

export function monthName(midx) {
  const y = 2026 + Math.floor(midx / 12);
  const mo = ((midx % 12) + 12) % 12;
  return `${MONTH_ABBR[mo]} ${y}`;
}

export function allInitiatives() {
  const r = [];
  TREE.forEach((g) => g.initiatives.forEach((i) => r.push({ ...i, line: g.nombre })));
  return r;
}

export function allNodes() {
  const r = [];
  TREE.forEach((g) =>
    g.initiatives.forEach((i) => {
      r.push({ ...i, line: g.nombre, kind: "init", responsable: i.responsable || "" });
      i.activities.forEach((a) =>
        r.push({ ...a, line: g.nombre, kind: "act", parent: i.nombre, responsable: a.responsable || "" })
      );
    })
  );
  return r;
}
