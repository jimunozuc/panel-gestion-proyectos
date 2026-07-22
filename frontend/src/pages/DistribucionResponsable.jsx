import { useMemo } from "react";
import BackButton from "../components/BackButton.jsx";
import {
  TEAM,
  allNodes,
  initials,
  lineMeta,
  personColor,
  statusOf,
  STATUS_META,
} from "../utils/dashboard.js";

function initStatus(init) {
  if (init.activities && init.activities.length) {
    const avg = Math.round(
      init.activities.reduce((s, a) => s + (Number(a.avance) || 0), 0) / init.activities.length
    );
    return statusOf(avg);
  }
  return statusOf(init.avance);
}

export default function DistribucionResponsable() {
  const nodes = useMemo(() => allNodes(), []);

  return (
    <main className="page responsable-page">
      <BackButton to="/panel-gestion" label="← Volver a Panel de Gestión" />
      <h1>Distribución por Responsable</h1>

      <div className="responsable-grid">
        {TEAM.map((person) => {
          const mine = nodes.filter((n) => n.responsable === person);
          const inits = mine.filter((n) => n.kind === "init");
          const acts = mine.filter((n) => n.kind === "act");
          const leaves = mine.filter(
            (n) => n.kind === "act" || (n.kind === "init" && (!n.activities || !n.activities.length))
          );
          const prog = leaves.length
            ? Math.round(leaves.reduce((s, n) => s + (Number(n.avance) || 0), 0) / leaves.length)
            : 0;
          const lines = [...new Set(mine.map((n) => n.line))];

          return (
            <div key={person} className="responsable-card">
              <div className="responsable-header">
                <span className="responsable-avatar" style={{ background: personColor(person) }}>
                  {initials(person)}
                </span>
                <div className="responsable-name-block">
                  <div className="responsable-name">{person}</div>
                  <div className="responsable-count">
                    {inits.length} iniciativas · {acts.length} actividades
                  </div>
                </div>
                <div className="responsable-progress">
                  <div className="responsable-progress-value" style={{ color: personColor(person) }}>
                    {prog}%
                  </div>
                  <div className="responsable-progress-label">avance</div>
                </div>
              </div>

              {mine.length === 0 ? (
                <div className="responsable-empty">Sin asignaciones actuales.</div>
              ) : (
                <div className="responsable-items">
                  {inits.map((i) => {
                    const meta = lineMeta(i.line);
                    const status = STATUS_META[initStatus(i)];
                    return (
                      <div key={i.row} className="responsable-item">
                        <span className="responsable-item-dot" style={{ background: meta.c }} />
                        <span className="responsable-item-name">{i.nombre}</span>
                        <span
                          className="responsable-item-status"
                          style={{ background: status.soft, color: status.c }}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                  {acts.length > 0 && (
                    <div className="responsable-acts">
                      <div className="responsable-acts-label">Actividades reasignadas</div>
                      {acts.map((a) => (
                        <div key={a.row} className="responsable-act">
                          <span className="responsable-act-dot" />
                          <span className="responsable-act-name">{a.nombre}</span>
                          <span className="responsable-act-avance">{a.avance}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="responsable-lines">
                {lines.map((l) => {
                  const meta = lineMeta(l);
                  return (
                    <span key={l} className="responsable-line-tag" style={{ background: meta.soft, color: meta.c }}>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
