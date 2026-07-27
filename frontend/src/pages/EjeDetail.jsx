import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { OBJETIVOS, getIniciativas } from "../data/plan.js";
import { useMultipleIniciativaData } from "../utils/useIniciativaData.js";
import { summarizeTree } from "../utils/dashboard.js";

function tituloSinPrefijo(label) {
  return label.replace(/^\S+\s+/, "");
}

function proyectosRealesDe(iniciativa) {
  return (iniciativa.proyectos || []).filter((p) => p.enabled && p.sheetId);
}

function rollup(iniciativa, dataById) {
  const summaries = proyectosRealesDe(iniciativa)
    .map((p) => dataById[p.sheetId]?.tree)
    .filter(Boolean)
    .map(summarizeTree);
  const totalTasks = summaries.reduce((s, x) => s + x.taskCount, 0);
  if (!totalTasks) return null;
  const avance = Math.round(
    summaries.reduce((s, x) => s + x.avance * x.taskCount, 0) / totalTasks
  );
  const hitosDone = summaries.reduce((s, x) => s + x.hitosDone, 0);
  const hitosTotal = summaries.reduce((s, x) => s + x.hitosTotal, 0);
  return { avance, hitosDone, hitosTotal };
}

export default function EjeDetail() {
  const { ejeId } = useParams();
  const eje = OBJETIVOS.find((o) => o.id === ejeId);
  const iniciativas = getIniciativas(ejeId);

  const sheetIds = useMemo(
    () => iniciativas.flatMap((it) => proyectosRealesDe(it).map((p) => p.sheetId)),
    [iniciativas]
  );
  const { dataById } = useMultipleIniciativaData(sheetIds);

  if (iniciativas.length === 0) {
    return (
      <p className="subtitle">
        Todavía no hay datos cargados para {eje ? eje.label : ejeId}.
      </p>
    );
  }

  return (
    <div className="nivel-grid" style={{ "--card-color": eje?.color }}>
      {iniciativas.map((it) => {
        const progreso = rollup(it, dataById);
        return (
          <div key={it.id} className={`nivel-card${it.enabled ? "" : " nivel-card--disabled"}`}>
            <span className="nivel-card-num">{it.id}</span>
            <h3 className="nivel-card-title">
              {tituloSinPrefijo(it.label)}
              {progreso && (
                <span className="nivel-card-progress">
                  <strong>{progreso.avance}%</strong> · {progreso.hitosDone}/{progreso.hitosTotal} hitos
                </span>
              )}
            </h3>
            {it.descripcion && <p className="nivel-card-desc">{it.descripcion}</p>}
            {it.proyectos && it.proyectos.length > 0 ? (
              <div className="nivel-card-proyectos">
                {it.proyectos.map((p) =>
                  p.enabled ? (
                    <Link key={p.id} to={p.route} className="nivel-chip">
                      {p.label}
                    </Link>
                  ) : (
                    <span key={p.id} className="nivel-chip nivel-chip--disabled" aria-disabled="true">
                      {p.label}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="nivel-card-empty">Aún no hay proyectos definidos.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
