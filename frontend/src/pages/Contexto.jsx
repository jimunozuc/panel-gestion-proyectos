import { MISION_INSTITUCIONAL, OBJETIVOS } from "../data/plan.js";

export default function Contexto() {
  return (
    <div className="vista contexto-page">
      <p className="contexto-mision">{MISION_INSTITUCIONAL}</p>

      <div className="contexto-grid">
        {OBJETIVOS.map((o) => (
          <div key={o.id} className="contexto-card" style={{ "--card-color": o.color }}>
            <span className="contexto-card-num">{o.numero}</span>
            <h3 className="contexto-card-title">{o.label}</h3>
            <p className="contexto-card-desc">{o.descripcion}</p>
          </div>
        ))}
      </div>

      <div className="contexto-extra">
        <h3>Detalle adicional</h3>
        <p className="contexto-extra-placeholder">
          Espacio reservado para contenido adicional — se completará más adelante.
        </p>
      </div>
    </div>
  );
}
