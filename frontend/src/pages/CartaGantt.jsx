import { useMemo, useState } from "react";
import BackButton from "../components/BackButton.jsx";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import {
  buildMonthGrid,
  fmtDate,
  initials,
  lineMeta,
  personColor,
  statusOf,
} from "../utils/dashboard.js";

const INICIATIVA = "6.2";
const COL_WIDTH = 42;
const LABEL_WIDTH = 260;

function barColorFor(avance) {
  const status = statusOf(avance);
  if (status === "completada") return "#00870A";
  if (status === "en_curso") return "var(--uc-azul)";
  return "#E2E8F0";
}

function GanttBar({ node, grid }) {
  const ms = grid.monthIndexOf(node.inicio);
  const me = grid.monthIndexOf(node.fin) ?? ms;
  if (ms == null) return null;

  const status = statusOf(node.avance);
  const color = barColorFor(node.avance);

  if (node.tipo === "Hito") {
    return (
      <div
        className="gantt-hito"
        style={{ left: LABEL_WIDTH + ms * COL_WIDTH + COL_WIDTH / 2 - 7 }}
        title={`${node.nombre} · ${fmtDate(node.inicio)}`}
      >
        <span style={{ background: color }} />
      </div>
    );
  }

  const width = Math.max((me - ms + 1) * COL_WIDTH - 8, 10);
  return (
    <div
      className="gantt-bar-track"
      style={{
        left: LABEL_WIDTH + ms * COL_WIDTH + 4,
        width,
        background: status === "pendiente" ? "#EFF1F3" : `${color}33`,
        border: status === "pendiente" ? "1px solid #CBD5E1" : "none",
      }}
      title={`${node.nombre} · ${fmtDate(node.inicio)}–${fmtDate(node.fin)} · ${node.avance}%`}
    >
      {status !== "pendiente" && (
        <div className="gantt-bar-fill" style={{ width: `${node.avance}%`, background: color }} />
      )}
    </div>
  );
}

export default function CartaGantt() {
  const { loading, error, data } = useIniciativaData(INICIATIVA);
  const [lineFilter, setLineFilter] = useState("todas");
  const [closedLines, setClosedLines] = useState({});
  const [openInits, setOpenInits] = useState({});

  const grid = useMemo(
    () => (data ? buildMonthGrid(data.tree) : { months: [], monthIndexOf: () => null }),
    [data]
  );

  const groups = useMemo(() => {
    if (!data) return [];
    return data.tree.filter((g) => lineFilter === "todas" || g.nombre === lineFilter);
  }, [data, lineFilter]);

  const barsWidth = COL_WIDTH * grid.months.length;

  return (
    <main className="page gantt-page">
      <BackButton to="/panel-gestion" label="← Volver a Panel de Gestión" />
      <h1>Carta Gantt</h1>

      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <p className="data-updated-at">
            Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
          </p>

          <div className="gantt-filters">
            <label className="gantt-filter-label">
              Línea:{" "}
              <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)}>
                <option value="todas">Todas las líneas</option>
                {data.tree.map((g) => (
                  <option key={g.nombre} value={g.nombre}>
                    {lineMeta(g.nombre).label}
                  </option>
                ))}
              </select>
            </label>
            <div className="gantt-legend">
              <span>
                <span className="gantt-legend-swatch" style={{ background: "var(--uc-azul)" }} /> En curso
              </span>
              <span>
                <span className="gantt-legend-swatch" style={{ background: "#00870A" }} /> Completada
              </span>
              <span>
                <span className="gantt-legend-swatch gantt-legend-swatch--outline" /> Pendiente
              </span>
              <span>
                <span className="gantt-legend-diamond" /> Hito
              </span>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="subtitle">No hay datos para esta línea.</p>
          ) : (
            <div className="gantt-scroll">
              <div className="gantt-table" style={{ minWidth: LABEL_WIDTH + barsWidth }}>
                <div className="gantt-row gantt-row--header">
                  <div className="gantt-label-cell gantt-label-cell--header" style={{ width: LABEL_WIDTH }}>
                    Línea / iniciativa / actividad
                  </div>
                  {grid.months.map((label, idx) => (
                    <div key={idx} className="gantt-month-cell" style={{ width: COL_WIDTH }}>
                      {label}
                    </div>
                  ))}
                </div>

                {groups.map((g) => {
                  const meta = lineMeta(g.nombre);
                  const open = closedLines[g.nombre] !== true;
                  return (
                    <div key={g.nombre}>
                      <button
                        type="button"
                        className="gantt-row gantt-row--line"
                        onClick={() => setClosedLines((p) => ({ ...p, [g.nombre]: open }))}
                        style={{ background: meta.soft, width: LABEL_WIDTH + barsWidth }}
                      >
                        <div className="gantt-label-cell" style={{ width: LABEL_WIDTH }}>
                          <span className="gantt-chevron">{open ? "▾" : "▸"}</span>
                          <span className="gantt-dot" style={{ background: meta.c }} />
                          <span className="gantt-line-name">{meta.label}</span>
                        </div>
                      </button>

                      {open &&
                        g.initiatives.map((i) => {
                          const hasActs = i.activities && i.activities.length > 0;
                          const initOpen = !!openInits[i.row];
                          return (
                            <div key={i.row}>
                              <div className="gantt-row gantt-row--init">
                                <div
                                  className="gantt-label-cell gantt-label-cell--init"
                                  style={{ width: LABEL_WIDTH }}
                                >
                                  {hasActs ? (
                                    <button
                                      type="button"
                                      className="gantt-chevron-btn"
                                      onClick={() => setOpenInits((p) => ({ ...p, [i.row]: !initOpen }))}
                                    >
                                      {initOpen ? "▾" : "▸"}
                                    </button>
                                  ) : (
                                    <span className="gantt-chevron-spacer" />
                                  )}
                                  <span className="gantt-item-name">
                                    {i.tipo === "Hito" ? "◆ " : ""}
                                    {i.nombre}
                                  </span>
                                  <span
                                    className="hito-avatar gantt-avatar"
                                    style={{ background: personColor(i.responsable, data.team) }}
                                    title={i.responsable || "Sin responsable"}
                                  >
                                    {initials(i.responsable)}
                                  </span>
                                </div>
                                <GanttBar node={i} grid={grid} />
                              </div>

                              {initOpen &&
                                i.activities.map((a) => (
                                  <div key={a.row} className="gantt-row gantt-row--act">
                                    <div
                                      className="gantt-label-cell gantt-label-cell--act"
                                      style={{ width: LABEL_WIDTH }}
                                    >
                                      <span className="gantt-item-name gantt-item-name--act">
                                        {a.tipo === "Hito" ? "◆ " : ""}
                                        {a.nombre}
                                      </span>
                                      <span
                                        className="hito-avatar gantt-avatar"
                                        style={{ background: personColor(a.responsable, data.team) }}
                                        title={a.responsable || "Sin responsable"}
                                      >
                                        {initials(a.responsable)}
                                      </span>
                                    </div>
                                    <GanttBar node={a} grid={grid} />
                                  </div>
                                ))}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
