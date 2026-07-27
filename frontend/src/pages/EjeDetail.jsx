import { Link, useParams } from "react-router-dom";
import { OBJETIVOS, getIniciativas } from "../data/plan.js";

function tituloSinPrefijo(label) {
  return label.replace(/^\S+\s+/, "");
}

export default function EjeDetail() {
  const { ejeId } = useParams();
  const eje = OBJETIVOS.find((o) => o.id === ejeId);
  const iniciativas = getIniciativas(ejeId);

  if (iniciativas.length === 0) {
    return (
      <p className="subtitle">
        Todavía no hay datos cargados para {eje ? eje.label : ejeId}.
      </p>
    );
  }

  return (
    <div className="nivel-grid" style={{ "--card-color": eje?.color }}>
      {iniciativas.map((it) => (
        <div key={it.id} className={`nivel-card${it.enabled ? "" : " nivel-card--disabled"}`}>
          <span className="nivel-card-num">{it.id}</span>
          <h3 className="nivel-card-title">{tituloSinPrefijo(it.label)}</h3>
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
      ))}
    </div>
  );
}
