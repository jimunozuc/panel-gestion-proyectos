import { useParams, Link } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { EJES, INICIATIVAS_INTELIGENCIA_DIGITAL } from "../data/plan.js";

const INICIATIVAS_POR_EJE = {
  "inteligencia-digital": INICIATIVAS_INTELIGENCIA_DIGITAL,
};

export default function EjeDetail() {
  const { ejeId } = useParams();
  const eje = EJES.find((e) => e.id === ejeId);
  const iniciativas = INICIATIVAS_POR_EJE[ejeId] || [];

  return (
    <main className="page plan-page">
      <BackButton to="/" />
      <p className="plan-eyebrow">Eje del Plan</p>
      <h1>{eje ? eje.label : ejeId}</h1>
      <div className="plan-buttons">
        {iniciativas.map((it) =>
          it.enabled ? (
            <Link key={it.id} to="/panel-gestion" className="plan-button">
              {it.label}
            </Link>
          ) : (
            <span key={it.id} className="plan-button plan-button--disabled">
              {it.label}
            </span>
          )
        )}
      </div>
    </main>
  );
}
