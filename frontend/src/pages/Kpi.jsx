import { useMemo } from "react";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import {
  allInitiatives,
  allNodes,
  buildMonthGrid,
  fmtDate,
  initials,
  lineMeta,
  personColor,
  statusOf,
} from "../utils/dashboard.js";

const INICIATIVA = "6.2";

function leavesOf(nodes) {
  return nodes.filter((n) => n.kind === "act" || (n.kind === "init" && (!n.activities || !n.activities.length)));
}

function avgAvance(items) {
  if (!items.length) return 0;
  return Math.round(items.reduce((s, n) => s + (Number(n.avance) || 0), 0) / items.length);
}

export default function Kpi() {
  const { loading, error, data } = useIniciativaData(INICIATIVA);

  const nodes = useMemo(() => (data ? allNodes(data.tree) : []), [data]);
  const inits = useMemo(() => (data ? allInitiatives(data.tree) : []), [data]);
  const leaves = useMemo(() => leavesOf(nodes), [nodes]);
  const hitos = useMemo(() => nodes.filter((n) => n.tipo === "Hito"), [nodes]);
  const grid = useMemo(
    () => (data ? buildMonthGrid(data.tree) : { monthIndexOf: () => null }),
    [data]
  );

  const overall = avgAvance(leaves);
  const done = leaves.filter((n) => statusOf(n.avance) === "completada").length;
  const curso = leaves.filter((n) => statusOf(n.avance) === "en_curso").length;
  const pend = leaves.filter((n) => statusOf(n.avance) === "pendiente").length;
  const hitosDone = hitos.filter((h) => statusOf(h.avance) === "completada").length;

  const todayIdx = grid.monthIndexOf(new Date().toISOString().slice(0, 10));
  const upcoming = useMemo(() => {
    const sorted = [...hitos].sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
    const future = sorted.filter((h) => {
      const idx = grid.monthIndexOf(h.fin);
      return idx == null || todayIdx == null ? true : idx >= todayIdx;
    });
    return (future.length ? future : sorted).slice(0, 6);
  }, [hitos, grid, todayIdx]);

  const maxAssignments = Math.max(
    1,
    ...(data?.team || []).map((p) => nodes.filter((n) => n.responsable === p).length)
  );

  return (
    <div className="vista kpi-page">
      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <p className="data-updated-at">
            Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
          </p>

          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-card-value">{overall}%</div>
              <div className="kpi-card-label">Avance global</div>
              <div className="kpi-card-sub">{leaves.length} actividades</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">{inits.length}</div>
              <div className="kpi-card-label">Iniciativas</div>
              <div className="kpi-card-sub">en {data.tree.length} líneas</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">
                {hitosDone}/{hitos.length}
              </div>
              <div className="kpi-card-label">Hitos</div>
              <div className="kpi-card-sub">cumplidos</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">{curso}</div>
              <div className="kpi-card-label">En curso</div>
              <div className="kpi-card-sub">
                {done} completadas · {pend} pendientes
              </div>
            </div>
          </div>

          <div className="kpi-panels">
            <div className="kpi-panel kpi-panel--wide">
              <h3>Avance por línea de trabajo</h3>
              <p className="kpi-panel-desc">Progreso promedio de las actividades de cada línea.</p>
              <div className="kpi-line-list">
                {data.tree.map((g) => {
                  const meta = lineMeta(g.nombre);
                  const ls = [];
                  g.initiatives.forEach((i) => {
                    if (i.activities.length) i.activities.forEach((a) => ls.push(a));
                    else ls.push(i);
                  });
                  const prog = avgAvance(ls);
                  return (
                    <div key={g.nombre} className="kpi-line-row">
                      <div className="kpi-line-header">
                        <span className="kpi-line-label">
                          <span className="kpi-line-dot" style={{ background: meta.c }} />
                          {meta.label}
                          <span className="kpi-line-count">· {g.initiatives.length} iniciativas</span>
                        </span>
                        <span className="kpi-line-pct" style={{ color: meta.c }}>
                          {prog}%
                        </span>
                      </div>
                      <div className="kpi-bar-track" style={{ background: meta.soft }}>
                        <div className="kpi-bar-fill" style={{ width: `${prog}%`, background: meta.c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="kpi-panel">
              <h3>Carga por responsable</h3>
              <p className="kpi-panel-desc">Iniciativas y actividades asignadas actualmente.</p>
              {data.team.length === 0 ? (
                <p className="subtitle">Sin datos de responsables.</p>
              ) : (
                <div className="kpi-people-list">
                  {data.team.map((person) => {
                    const cnt = nodes.filter((n) => n.responsable === person).length;
                    const initCnt = inits.filter((i) => i.responsable === person).length;
                    return (
                      <div key={person} className="kpi-person-row">
                        <span
                          className="hito-avatar kpi-person-avatar"
                          style={{ background: personColor(person, data.team) }}
                        >
                          {initials(person)}
                        </span>
                        <div className="kpi-person-body">
                          <div className="kpi-person-top">
                            <span className="kpi-person-name">{person}</span>
                            <span className="kpi-person-count">
                              {initCnt} · {cnt}
                            </span>
                          </div>
                          <div className="kpi-bar-track kpi-bar-track--thin">
                            <div
                              className="kpi-bar-fill"
                              style={{
                                width: `${(cnt / maxAssignments) * 100}%`,
                                background: personColor(person, data.team),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="kpi-footnote">Formato: iniciativas · total de asignaciones.</p>
            </div>
          </div>

          <div className="kpi-panel kpi-panel--milestones">
            <h3>Próximos hitos</h3>
            <div className="kpi-milestone-list">
              {upcoming.map((h) => {
                const meta = lineMeta(h.line);
                return (
                  <div key={h.row} className="kpi-milestone-row">
                    <span className="kpi-milestone-dot" style={{ background: meta.c }} />
                    <div className="kpi-milestone-body">
                      <div className="kpi-milestone-name">{h.nombre}</div>
                      <div className="kpi-milestone-line">{meta.label}</div>
                    </div>
                    <span className="kpi-milestone-date">{fmtDate(h.inicio)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
