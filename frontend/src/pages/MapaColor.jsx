import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import { buildMonthGrid, lineMeta, monthLong } from "../utils/dashboard.js";

const COL_WIDTH = 56;
const LABEL_WIDTH = 220;
const TOTAL_WIDTH = 56;

function leavesOf(init) {
  return init.activities && init.activities.length ? init.activities : [init];
}

function activeAt(leaves, monthIdx, monthIndexOf) {
  return leaves.filter((lf) => {
    const ms = monthIndexOf(lf.inicio);
    const me = monthIndexOf(lf.fin);
    return ms != null && me != null && monthIdx >= ms && monthIdx <= me;
  });
}

export default function MapaColor() {
  const { sheetId } = useOutletContext();
  const { loading, error, data } = useIniciativaData(sheetId);
  const [selMonth, setSelMonth] = useState(null);
  const [selCell, setSelCell] = useState(null);

  const grid = useMemo(
    () => (data ? buildMonthGrid(data.tree) : { months: [], monthIndexOf: () => null }),
    [data]
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return data.tree.map((g) => ({
      nombre: g.nombre,
      meta: lineMeta(g.nombre),
      initiatives: g.initiatives.map((i) => {
        const leaves = leavesOf(i);
        const counts = grid.months.map((_, mo) => {
          const active = activeAt(leaves, mo, grid.monthIndexOf);
          return { count: active.length, hitos: active.filter((a) => a.tipo === "Hito").length };
        });
        return { init: i, leaves, counts, total: counts.reduce((s, c) => s + c.count, 0) };
      }),
    }));
  }, [data, grid]);

  const maxCount = useMemo(() => {
    let mx = 1;
    rows.forEach((r) => r.initiatives.forEach((ir) => ir.counts.forEach((c) => {
      if (c.count > mx) mx = c.count;
    })));
    return mx;
  }, [rows]);

  const monthSummary = useMemo(() => {
    if (selMonth == null) return null;
    let acts = 0;
    let hitos = 0;
    const items = [];
    rows.forEach((r) => {
      r.initiatives.forEach((ir) => {
        activeAt(ir.leaves, selMonth, grid.monthIndexOf).forEach((lf) => {
          if (lf.tipo === "Hito") hitos++;
          else acts++;
          items.push({ ...lf, line: r.nombre, parent: ir.init.nombre });
        });
      });
    });
    return { acts, hitos, items };
  }, [selMonth, rows, grid]);

  const cellSel = useMemo(() => {
    if (!selCell) return null;
    const r = rows.find((x) => x.nombre === selCell.line);
    const ir = r?.initiatives.find((x) => x.init.row === selCell.initRow);
    if (!ir) return null;
    return {
      line: r.nombre,
      meta: r.meta,
      init: ir.init,
      active: activeAt(ir.leaves, selCell.monthIdx, grid.monthIndexOf),
    };
  }, [selCell, rows, grid]);

  const gridWidth = LABEL_WIDTH + COL_WIDTH * grid.months.length + TOTAL_WIDTH;

  return (
    <div className="vista heatmap-page">
      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <p className="data-updated-at">
            Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
          </p>
          <p className="heatmap-intro">
            Cada celda es la cantidad de actividades activas de una iniciativa durante ese mes.
            Haz clic en un mes para ver el resumen, o en una celda para ver su detalle.
          </p>

          <div className="heatmap-layout">
            <div className="heatmap-table-wrap">
              <div className="heatmap-scroll">
              <div className="heatmap-table" style={{ minWidth: gridWidth }}>
                <div className="heatmap-row heatmap-row--header">
                  <div className="heatmap-label-cell heatmap-label-cell--header" style={{ width: LABEL_WIDTH }}>
                    Iniciativa
                  </div>
                  {grid.months.map((label, mo) => (
                    <button
                      type="button"
                      key={mo}
                      className={`heatmap-month-btn${selMonth === mo ? " heatmap-month-btn--selected" : ""}`}
                      style={{ width: COL_WIDTH }}
                      onClick={() => {
                        setSelCell(null);
                        setSelMonth(selMonth === mo ? null : mo);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="heatmap-total-cell heatmap-total-cell--header" style={{ width: TOTAL_WIDTH }}>
                    Total
                  </div>
                </div>

                {rows.map((r) => (
                  <div key={r.nombre}>
                    <div className="heatmap-line-header" style={{ background: `${r.meta.soft}66` }}>
                      <span className="heatmap-line-dot" style={{ background: r.meta.c }} />
                      <span className="heatmap-line-name" style={{ color: r.meta.c }}>
                        {r.meta.label}
                      </span>
                    </div>
                    {r.initiatives.map((ir) => (
                      <div key={ir.init.row} className="heatmap-row">
                        <div
                          className="heatmap-label-cell heatmap-label-cell--init"
                          style={{ width: LABEL_WIDTH }}
                          title={ir.init.nombre}
                        >
                          <span className="heatmap-init-tick" style={{ background: r.meta.c }} />
                          <span className="heatmap-init-name">{ir.init.nombre}</span>
                        </div>
                        {ir.counts.map((c, mo) => {
                          const t = c.count / maxCount;
                          const isColSel = selMonth === mo;
                          const isCellSel =
                            selCell && selCell.initRow === ir.init.row && selCell.monthIdx === mo;
                          return (
                            <button
                              type="button"
                              key={mo}
                              className={`heatmap-cell${isColSel ? " heatmap-cell--col-selected" : ""}${
                                isCellSel ? " heatmap-cell--selected" : ""
                              }`}
                              style={{
                                width: COL_WIDTH,
                                background: c.count ? r.meta.c : "transparent",
                                opacity: c.count ? 0.18 + 0.72 * t : 1,
                              }}
                              title={`${ir.init.nombre} · ${monthLong(mo, grid.epochYear)} · ${c.count} activas${
                                c.hitos ? ` · ${c.hitos} hito(s)` : ""
                              }`}
                              onClick={() => {
                                setSelMonth(null);
                                setSelCell(isCellSel ? null : { line: r.nombre, initRow: ir.init.row, monthIdx: mo });
                              }}
                            >
                              {c.count > 0 && (
                                <span
                                  className="heatmap-cell-value"
                                  style={{ color: t > 0.5 ? "#fff" : "#0a2540" }}
                                >
                                  {c.count}
                                  {c.hitos ? " ◆" : ""}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <div className="heatmap-total-cell" style={{ width: TOTAL_WIDTH }}>
                          {ir.total}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              </div>

              <div className="heatmap-legend">
                <span>Intensidad:</span>
                {[0.18, 0.36, 0.54, 0.72, 0.9].map((o, k) => (
                  <span key={k} className="heatmap-legend-swatch" style={{ opacity: o }} />
                ))}
                <span className="heatmap-legend-note">N = actividades activas · N ◆ = incluye hito</span>
              </div>
            </div>

            <div className="heatmap-detail">
              {selMonth != null && monthSummary ? (
                <div className="kpi-panel">
                  <div className="heatmap-detail-header">
                    <div>
                      <div className="heatmap-detail-badge">Resumen del mes</div>
                      <h3>{monthLong(selMonth, grid.epochYear)}</h3>
                    </div>
                    <button type="button" className="heatmap-detail-close" onClick={() => setSelMonth(null)}>
                      ✕
                    </button>
                  </div>
                  <div className="heatmap-detail-stats">
                    <div>
                      <div className="heatmap-detail-stat-value" style={{ color: "var(--uc-azul)" }}>
                        {monthSummary.acts}
                      </div>
                      <div className="heatmap-detail-stat-label">Actividades</div>
                    </div>
                    <div>
                      <div className="heatmap-detail-stat-value" style={{ color: "#D10068" }}>
                        {monthSummary.hitos}
                      </div>
                      <div className="heatmap-detail-stat-label">Hitos</div>
                    </div>
                  </div>
                  <div className="heatmap-detail-list-label">Tareas activas</div>
                  <div className="heatmap-detail-list">
                    {monthSummary.items.map((it, k) => {
                      const m = lineMeta(it.line);
                      return (
                        <div key={k} className="heatmap-detail-item">
                          {it.tipo === "Hito" ? (
                            <span className="heatmap-detail-dot heatmap-detail-dot--hito" style={{ background: m.c }} />
                          ) : (
                            <span className="heatmap-detail-dot" style={{ background: m.c }} />
                          )}
                          <div className="heatmap-detail-item-body">
                            <div className="heatmap-detail-item-name">{it.nombre}</div>
                            <div className="heatmap-detail-item-sub">
                              {it.parent} · {it.responsable || "Sin asignar"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {monthSummary.items.length === 0 && (
                      <p className="subtitle">Sin actividades activas este mes.</p>
                    )}
                  </div>
                </div>
              ) : cellSel ? (
                <div className="kpi-panel">
                  <div className="heatmap-detail-header">
                    <div>
                      <div
                        className="heatmap-detail-badge"
                        style={{ background: cellSel.meta.soft, color: cellSel.meta.c }}
                      >
                        {cellSel.meta.label}
                      </div>
                      <h3>{cellSel.init.nombre}</h3>
                      <p className="kpi-panel-desc">{monthLong(selCell.monthIdx, grid.epochYear)}</p>
                    </div>
                    <button type="button" className="heatmap-detail-close" onClick={() => setSelCell(null)}>
                      ✕
                    </button>
                  </div>
                  <div className="heatmap-detail-stats">
                    <div>
                      <div className="heatmap-detail-stat-value" style={{ color: "var(--uc-azul)" }}>
                        {cellSel.active.filter((a) => a.tipo !== "Hito").length}
                      </div>
                      <div className="heatmap-detail-stat-label">Actividades</div>
                    </div>
                    <div>
                      <div className="heatmap-detail-stat-value" style={{ color: "#D10068" }}>
                        {cellSel.active.filter((a) => a.tipo === "Hito").length}
                      </div>
                      <div className="heatmap-detail-stat-label">Hitos</div>
                    </div>
                  </div>
                  <div className="heatmap-detail-list-label">Tareas activas</div>
                  <div className="heatmap-detail-list">
                    {cellSel.active.map((it, k) => (
                      <div key={k} className="heatmap-detail-item">
                        {it.tipo === "Hito" ? (
                          <span
                            className="heatmap-detail-dot heatmap-detail-dot--hito"
                            style={{ background: cellSel.meta.c }}
                          />
                        ) : (
                          <span className="heatmap-detail-dot" style={{ background: "#94A3B8" }} />
                        )}
                        <div className="heatmap-detail-item-body">
                          <div className="heatmap-detail-item-name">{it.nombre}</div>
                          <div className="heatmap-detail-item-sub">
                            {it.responsable || "Sin asignar"} · {it.avance}%
                          </div>
                        </div>
                      </div>
                    ))}
                    {cellSel.active.length === 0 && <p className="subtitle">Sin actividades activas.</p>}
                  </div>
                </div>
              ) : (
                <div className="heatmap-detail-empty">
                  <p>Selecciona un mes o una celda para ver el detalle aquí.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
