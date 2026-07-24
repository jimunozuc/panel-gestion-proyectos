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
          <div className="nivel-card-action">
            {it.enabled && it.route ? (
              <Link to={it.route} className="btn-continuar btn-continuar--sm">
                Continuar
                <span className="material-symbols-rounded" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            ) : (
              <span className="btn-continuar--disabled" aria-disabled="true">
                Próximamente
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
