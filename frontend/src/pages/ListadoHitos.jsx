import { useMemo } from "react";
import BackButton from "../components/BackButton.jsx";
import {
  allNodes,
  fmtDate,
  initials,
  lineMeta,
  monthName,
  personColor,
  statusOf,
  STATUS_META,
} from "../utils/dashboard.js";

const TAG_LABELS = {
  PUBLI: "Publicaciones",
  GOBER: "Gobernanza",
  ANUNC: "Anuncios",
  EVENT: "Eventos",
  AVANC: "Avances",
};

export default function ListadoHitos() {
  const hitos = useMemo(
    () =>
      allNodes()
        .filter((n) => n.tipo === "Hito")
        .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || "")),
    []
  );

  const byMonth = {};
  hitos.forEach((h) => {
    const key = h.inicio ? h.inicio.slice(0, 7) : "—";
    (byMonth[key] = byMonth[key] || []).push(h);
  });
  const monthKeys = Object.keys(byMonth).sort();
  const monthLabel = (key) => {
    if (key === "—") return "Sin fecha";
    const [y, mo] = key.split("-");
    return monthName((Number(y) - 2026) * 12 + (Number(mo) - 1));
  };

  return (
    <main className="page hitos-page">
      <BackButton to="/panel-gestion" label="← Volver a Panel de Gestión" />
      <h1>Listado de Hitos</h1>

      <div className="hitos-tags">
        {Object.keys(TAG_LABELS).map((tag) => {
          const count = hitos.filter((h) => h.etiq === tag).length;
          if (!count) return null;
          return (
            <div key={tag} className="hitos-tag-card">
              <div className="hitos-tag-label">{TAG_LABELS[tag]}</div>
              <div className="hitos-tag-count">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="hitos-timeline">
        {monthKeys.map((key) => (
          <div key={key} className="hitos-month-group">
            <div className="hitos-month-label">
              <span className="hitos-month-dot" />
              {monthLabel(key)}
            </div>
            <div className="hitos-month-items">
              {byMonth[key].map((h) => {
                const meta = lineMeta(h.line);
                const status = STATUS_META[statusOf(h.avance)];
                return (
                  <div key={h.row} className="hito-card">
                    <span className="hito-marker" style={{ background: meta.c }} />
                    <div className="hito-info">
                      <div className="hito-name">{h.nombre}</div>
                      <div className="hito-sub">
                        {meta.label}
                        {h.parent ? ` · ${h.parent}` : ""}
                        {h.etiq ? ` · ${h.etiq}` : ""}
                      </div>
                    </div>
                    <span
                      className="hito-avatar"
                      style={{ background: personColor(h.responsable) }}
                      title={h.responsable || "Sin responsable"}
                    >
                      {initials(h.responsable)}
                    </span>
                    <span className="hito-date">{fmtDate(h.inicio)}</span>
                    <span
                      className="hito-status"
                      style={{ background: status.soft, color: status.c }}
                    >
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
