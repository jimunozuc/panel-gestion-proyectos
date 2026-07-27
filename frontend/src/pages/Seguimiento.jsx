import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getTodosLosProyectosReales } from "../data/plan.js";
import { useMultipleIniciativaData } from "../utils/useIniciativaData.js";
import {
  allNodes,
  fmtDate,
  initials,
  personColor,
  PERSON_COLORS,
  statusOf,
  summarizeTree,
} from "../utils/dashboard.js";

function proyectoColor(idx) {
  return PERSON_COLORS[idx % PERSON_COLORS.length];
}

function leavesOf(nodes) {
  return nodes.filter((n) => n.kind === "act" || (n.kind === "init" && (!n.activities || !n.activities.length)));
}

export default function Seguimiento() {
  const entries = useMemo(() => getTodosLosProyectosReales(), []);
  const sheetIds = useMemo(() => entries.map((e) => e.proyecto.sheetId), [entries]);
  const { loading, dataById } = useMultipleIniciativaData(sheetIds);

  const proyectos = useMemo(
    () =>
      entries.map((e, idx) => {
        const data = dataById[e.proyecto.sheetId];
        return { ...e, data, resumen: data ? summarizeTree(data.tree) : null, color: proyectoColor(idx) };
      }),
    [entries, dataById]
  );

  const conDatos = proyectos.filter((p) => p.data);

  const totalTasks = conDatos.reduce((s, p) => s + p.resumen.taskCount, 0);
  const avanceGlobal = totalTasks
    ? Math.round(conDatos.reduce((s, p) => s + p.resumen.avance * p.resumen.taskCount, 0) / totalTasks)
    : 0;
  const hitosDone = conDatos.reduce((s, p) => s + p.resumen.hitosDone, 0);
  const hitosTotal = conDatos.reduce((s, p) => s + p.resumen.hitosTotal, 0);

  const team = useMemo(() => [...new Set(conDatos.flatMap((p) => p.data.team))], [conDatos]);

  const nodes = useMemo(
    () =>
      conDatos.flatMap((p) =>
        allNodes(p.data.tree).map((n) => ({ ...n, proyecto: p.proyecto.label, proyectoColor: p.color }))
      ),
    [conDatos]
  );

  const leaves = leavesOf(nodes);
  const curso = leaves.filter((n) => statusOf(n.avance) === "en_curso").length;
  const hitos = nodes.filter((n) => n.tipo === "Hito");
  const upcoming = useMemo(
    () => [...hitos].sort((a, b) => (a.inicio || "").localeCompare(b.inicio || "")).slice(0, 8),
    [hitos]
  );
  const maxAssignments = Math.max(1, ...team.map((p) => nodes.filter((n) => n.responsable === p).length));

  return (
    <div className="vista seguimiento-page">
      <p className="subtitle">Seguimiento consolidado de todos los proyectos reales del Plan.</p>

      {loading && <p className="subtitle">Cargando datos...</p>}

      {!loading && conDatos.length === 0 && (
        <p className="subtitle">Todavía no hay proyectos con datos reales conectados.</p>
      )}

      {conDatos.length > 0 && (
        <>
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-card-value">{avanceGlobal}%</div>
              <div className="kpi-card-label">Avance global</div>
              <div className="kpi-card-sub">{leaves.length} actividades</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">{conDatos.length}</div>
              <div className="kpi-card-label">Proyectos</div>
              <div className="kpi-card-sub">con datos reales</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">
                {hitosDone}/{hitosTotal}
              </div>
              <div className="kpi-card-label">Hitos</div>
              <div className="kpi-card-sub">cumplidos</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-value">{curso}</div>
              <div className="kpi-card-label">En curso</div>
              <div className="kpi-card-sub">actividades</div>
            </div>
          </div>

          <div className="kpi-panels">
            <div className="kpi-panel kpi-panel--wide">
              <h3>Avance por proyecto</h3>
              <p className="kpi-panel-desc">Progreso de cada proyecto real conectado hoy.</p>
              <div className="kpi-line-list">
                {proyectos.map((p) => (
                  <div key={p.proyecto.id} className="kpi-line-row">
                    <div className="kpi-line-header">
                      <span className="kpi-line-label">
                        <span className="kpi-line-dot" style={{ background: p.color }} />
                        {p.data ? (
                          <Link to={p.proyecto.route} className="seguimiento-proyecto-link">
                            {p.proyecto.label}
                          </Link>
                        ) : (
                          p.proyecto.label
                        )}
                        {p.resumen && <span className="kpi-line-count">· {p.resumen.taskCount} actividades</span>}
                      </span>
                      {p.resumen && (
                        <span className="kpi-line-pct" style={{ color: p.color }}>
                          {p.resumen.avance}%
                        </span>
                      )}
                    </div>
                    {p.resumen && (
                      <div className="kpi-bar-track" style={{ background: `${p.color}22` }}>
                        <div className="kpi-bar-fill" style={{ width: `${p.resumen.avance}%`, background: p.color }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-panel">
              <h3>Carga por responsable</h3>
              <p className="kpi-panel-desc">Asignaciones actuales en todos los proyectos conectados.</p>
              {team.length === 0 ? (
                <p className="subtitle">Sin datos de responsables.</p>
              ) : (
                <div className="kpi-people-list">
                  {team.map((person) => {
                    const cnt = nodes.filter((n) => n.responsable === person).length;
                    return (
                      <div key={person} className="kpi-person-row">
                        <span
                          className="hito-avatar kpi-person-avatar"
                          style={{ background: personColor(person, team) }}
                        >
                          {initials(person)}
                        </span>
                        <div className="kpi-person-body">
                          <div className="kpi-person-top">
                            <span className="kpi-person-name">{person}</span>
                            <span className="kpi-person-count">{cnt}</span>
                          </div>
                          <div className="kpi-bar-track kpi-bar-track--thin">
                            <div
                              className="kpi-bar-fill"
                              style={{
                                width: `${(cnt / maxAssignments) * 100}%`,
                                background: personColor(person, team),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="kpi-panel kpi-panel--milestones">
            <h3>Próximos hitos</h3>
            <div className="kpi-milestone-list">
              {upcoming.map((h, idx) => (
                <div key={`${h.row}-${idx}`} className="kpi-milestone-row">
                  <span className="kpi-milestone-dot" style={{ background: h.proyectoColor }} />
                  <div className="kpi-milestone-body">
                    <div className="kpi-milestone-name">{h.nombre}</div>
                    <div className="kpi-milestone-line">{h.proyecto}</div>
                  </div>
                  <span className="kpi-milestone-date">{fmtDate(h.inicio)}</span>
                </div>
              ))}
              {upcoming.length === 0 && <p className="subtitle">Sin hitos registrados.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
