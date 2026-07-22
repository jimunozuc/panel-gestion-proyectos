import { Link } from "react-router-dom";
import { EJES } from "../data/plan.js";

export default function Iniciativas() {
  return (
    <main className="page plan-page">
      <p className="plan-eyebrow">Dirección de IA · VRID · UC</p>
      <h1>Iniciativas</h1>
      <div className="plan-buttons">
        {EJES.map((eje) =>
          eje.enabled ? (
            <Link key={eje.id} to={`/ejes/${eje.id}`} className="plan-button">
              {eje.label}
            </Link>
          ) : (
            <span key={eje.id} className="plan-button plan-button--disabled">
              {eje.label}
            </span>
          )
        )}
      </div>
    </main>
  );
}
