import { useMemo, useState } from "react";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import { buildMonthGrid, fmtDate, initials, lineMeta, personColor, statusOf, STATUS_META } from "../utils/dashboard.js";

const INICIATIVA = "6.2";
const COL_WIDTH = 44;
const LABEL_WIDTH = 200;

function leavesOf(init) {
  return init.activities && init.activities.length ? init.activities : [init];
}

function buildQuarters(monthCount, epochYear) {
  const quarters = [];
  for (let start = 0; start < monthCount; start += 3) {
    const end = Math.min(start + 2, monthCount - 1);
    const y = epochYear + Math.floor(start / 12);
    const q = Math.floor((start % 12) / 3) + 1;
    quarters.push({ label: `Q${q} ${y}`, start, end });
  }
  return quarters;
}

export default function Roadmap() {
  const { loading, error, data } = useIniciativaData(INICIATIVA);
  const [selected, setSelected] = useState(null);

  const grid = useMemo(
    () => (data ? buildMonthGrid(data.tree) : { months: [], monthIndexOf: () => null, epochYear: 2026 }),
    [data]
  );

  const quarters = useMemo(
    () => buildQuarters(grid.months.length, grid.epochYear),
    [grid]
  );

  const todayIdx = grid.monthIndexOf(new Date().toISOString().slice(0, 10));

  const lineData = useMemo(() => {
    if (!data) return [];
    return data.tree.map((g) => {
      const density = Array(grid.months.length).fill(0);
      const hitos = [];
      g.initiatives.forEach((i) => {
        leavesOf(i).forEach((lf) => {
          const ms = grid.monthIndexOf(lf.inicio);
          const me = grid.monthIndexOf(lf.fin);
          if (ms != null && me != null) {
            for (let mo = ms; mo <= me; mo++) density[mo]++;
          }
          if (lf.tipo === "Hito" && ms != null) {
            hitos.push({ ...lf, line: g.nombre, parent: i.nombre, ms });
          }
        });
      });
      return { g, meta: lineMeta(g.nombre), density, hitos, maxD: Math.max(...density, 1) };
    });
  }, [data, grid]);

  const quarterStats = useMemo(() => {
    return quarters.map((q) => {
      const inQ = lineData.flatMap((ld) => ld.hitos.filter((h) => h.ms >= q.start && h.ms <= q.end));
      let peak = 0;
      for (let mo = q.start; mo <= q.end; mo++) {
        let s = 0;
        lineData.forEach((ld) => (s += ld.density[mo] || 0));
        peak = Math.max(peak, s);
      }
      const perLine = lineData.map((ld) => ({
        line: ld.g.nombre,
        count: ld.hitos.filter((h) => h.ms >= q.start && h.ms <= q.end).length,
      }));
      return { q, hitos: inQ.length, peak, perLine };
    });
  }, [quarters, lineData]);

  const totalWidth = LABEL_WIDTH + COL_WIDTH * grid.months.length;

  return (
    <div className="vista roadmap-page">
      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <p className="data-updated-at">
            Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
          </p>
          <p className="heatmap-intro">
            Vista trimestral con hitos clave por línea. Haz clic en un hito (◆) para ver su detalle.
          </p>

          <div className="roadmap-table-wrap">
            <div className="roadmap-scroll">
              <div className="roadmap-table" style={{ minWidth: totalWidth }}>
                <div className="roadmap-row roadmap-row--header">
                  <div className="roadmap-label-cell roadmap-label-cell--header" style={{ width: LABEL_WIDTH }}>
                    Línea
                  </div>
                  {quarters.map((q) => (
                    <div
                      key={q.label}
                      className="roadmap-quarter-header"
                      style={{ width: COL_WIDTH * (q.end - q.start + 1) }}
                    >
                      {q.label}
                    </div>
                  ))}
                </div>

                {lineData.map(({ g, meta, density, hitos, maxD }) => (
                  <div key={g.nombre} className="roadmap-row roadmap-row--line">
                    <div
                      className="roadmap-label-cell roadmap-label-cell--line"
                      style={{ width: LABEL_WIDTH, background: `${meta.soft}66` }}
                    >
                      <span className="roadmap-line-name" style={{ color: meta.c }}>
                        {meta.label}
                      </span>
                      <span className="roadmap-line-count">{hitos.length} hitos</span>
                    </div>
                    <div className="roadmap-timeline" style={{ width: COL_WIDTH * grid.months.length }}>
                      {quarters.slice(1).map((q) => (
                        <div
                          key={q.label}
                          className="roadmap-quarter-sep"
                          style={{ left: q.start * COL_WIDTH }}
                        />
                      ))}
                      {todayIdx != null && todayIdx >= 0 && todayIdx < grid.months.length && (
                        <div className="roadmap-today-line" style={{ left: todayIdx * COL_WIDTH + COL_WIDTH / 2 }} />
                      )}
                      <div className="roadmap-density-row">
                        {density.map((d, mo) => (
                          <div key={mo} className="roadmap-density-col" style={{ width: COL_WIDTH }}>
                            <div
                              className="roadmap-density-bar"
                              style={{
                                height: Math.max((d / maxD) * 32, d ? 4 : 1),
                                background: meta.c,
                                opacity: d ? 0.22 + 0.12 * Math.min(d / maxD, 1) : 0.06,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      {hitos.map((h, hi) => {
                        const status = statusOf(h.avance);
                        const isSel = selected && selected.row === h.row;
                        return (
                          <button
                            type="button"
                            key={`${h.row}-${hi}`}
                            className="roadmap-milestone"
                            style={{ left: h.ms * COL_WIDTH + COL_WIDTH / 2 - 9 }}
                            title={h.nombre}
                            onClick={() => setSelected(isSel ? null : h)}
                          >
                            <span
                              className={`roadmap-milestone-diamond${isSel ? " roadmap-milestone-diamond--selected" : ""}`}
                              style={{
                                background: status === "pendiente" ? "#fff" : meta.c,
                                borderColor: meta.c,
                                boxShadow: isSel ? `0 0 0 4px ${meta.soft}` : undefined,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selected && (
            <div className="roadmap-detail" style={{ borderColor: lineMeta(selected.line).c }}>
              <span
                className="roadmap-detail-diamond"
                style={{
                  background: statusOf(selected.avance) === "pendiente" ? "#fff" : lineMeta(selected.line).c,
                  borderColor: lineMeta(selected.line).c,
                }}
              />
              <div className="roadmap-detail-body">
                <span
                  className="heatmap-detail-badge"
                  style={{ background: lineMeta(selected.line).soft, color: lineMeta(selected.line).c }}
                >
                  {lineMeta(selected.line).label}
                </span>
                <h3>{selected.nombre}</h3>
                <p className="kpi-panel-desc">Iniciativa: {selected.parent}</p>
                <div className="roadmap-detail-stats">
                  <div>
                    <div className="heatmap-detail-stat-label">Fecha</div>
                    <div className="roadmap-detail-value">{fmtDate(selected.inicio)}</div>
                  </div>
                  <div>
                    <div className="heatmap-detail-stat-label">Estado</div>
                    <span
                      className="hito-status"
                      style={{
                        background: STATUS_META[statusOf(selected.avance)].soft,
                        color: STATUS_META[statusOf(selected.avance)].c,
                      }}
                    >
                      {STATUS_META[statusOf(selected.avance)].label}
                    </span>
                  </div>
                  <div>
                    <div className="heatmap-detail-stat-label">Avance</div>
                    <div className="roadmap-detail-value">{Number(selected.avance) || 0}%</div>
                  </div>
                  <div>
                    <div className="heatmap-detail-stat-label">Responsable</div>
                    <div className="roadmap-detail-resp">
                      <span
                        className="hito-avatar"
                        style={{ background: personColor(selected.responsable, data.team) }}
                      >
                        {initials(selected.responsable)}
                      </span>
                      {selected.responsable || "Sin asignar"}
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" className="heatmap-detail-close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
          )}

          <div className="roadmap-quarter-cards">
            {quarterStats.map(({ q, hitos, peak, perLine }) => (
              <div key={q.label} className="kpi-card roadmap-quarter-card">
                <div className="roadmap-quarter-card-title">{q.label}</div>
                <div className="roadmap-quarter-card-stats">
                  <div>
                    <div className="kpi-card-value">{hitos}</div>
                    <div className="kpi-card-sub">Hitos</div>
                  </div>
                  <div>
                    <div className="kpi-card-value">{peak}</div>
                    <div className="kpi-card-sub">Activ. pico</div>
                  </div>
                </div>
                <div className="roadmap-quarter-card-tags">
                  {perLine.filter((p) => p.count > 0).map((p) => {
                    const m = lineMeta(p.line);
                    return (
                      <span
                        key={p.line}
                        className="responsable-line-tag"
                        style={{ background: m.soft, color: m.c }}
                        title={m.label}
                      >
                        {p.count}
                      </span>
                    );
                  })}
                  {perLine.every((p) => p.count === 0) && <span className="subtitle">Sin hitos</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
