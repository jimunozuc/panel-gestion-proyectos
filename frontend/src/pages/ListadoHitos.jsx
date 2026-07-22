import { useMemo } from "react";
import BackButton from "../components/BackButton.jsx";
import { useIniciativaData } from "../utils/useIniciativaData.js";
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

const INICIATIVA = "6.2";

export default function ListadoHitos() {
  const { loading, error, data } = useIniciativaData(INICIATIVA);

  const hitos = useMemo(() => {
    if (!data) return [];
    return allNodes(data.tree)
      .filter((n) => n.tipo === "Hito")
      .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
  }, [data]);

  const byMonth = {};
  hitos.forEach((h) => {
    const key = h.inicio ? h.inicio.slice(0, 7) : "—";
    (byMonth[key] = byMonth[key] || []).push(h);
  });
  const monthKeys = Object.keys(byMonth).sort();
  const monthLabel = (key) => {
    if (key === "—") return "Sin fecha";
    const [y, mo] = key.split("-");
    return monthName((Number(y) - 2026) * 12 + (Number(mo) - 1), 2026);
  };

  return (
    <main className="page hitos-page">
      <BackButton to="/panel-gestion" label="← Volver a Panel de Gestión" />
      <h1>Listado de Hitos</h1>

      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <p className="data-updated-at">
            Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
          </p>
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
                          </div>
                        </div>
                        <span
                          className="hito-avatar"
                          style={{ background: personColor(h.responsable, data.team) }}
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
        </>
      )}
    </main>
  );
}
