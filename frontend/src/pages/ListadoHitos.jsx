import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import EditNodoModal from "../components/EditNodoModal.jsx";
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

export default function ListadoHitos() {
  const { sheetId } = useOutletContext();
  const { loading, error, data, reload } = useIniciativaData(sheetId);
  const [editing, setEditing] = useState(null);

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
    <div className="vista hitos-page">
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
                        {data.editable && (
                          <button
                            type="button"
                            className="hito-edit-btn"
                            onClick={() => setEditing(h)}
                            aria-label={`Editar ${h.nombre}`}
                          >
                            <span className="material-symbols-rounded" aria-hidden="true">
                              edit
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <EditNodoModal node={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  );
}
