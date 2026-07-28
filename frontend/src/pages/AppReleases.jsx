import { Link } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { RELEASES } from "../data/releases.js";

const STATUS_LABEL = {
  "en-curso": "En curso",
  hecho: "Hecho",
  planeado: "Planeado",
};

export default function AppReleases() {
  return (
    <main className="page releases-page">
      <BackButton label="← Volver al menú" />
      <h1>App Releases</h1>
      <p className="subtitle">Avances y versiones de esta aplicación.</p>
      <Link to="/como-funciona" className="releases-guide-link">
        <span className="material-symbols-rounded" aria-hidden="true">explore</span>
        ¿Nunca usaste esta app? Mirá cómo funciona
      </Link>
      <div className="releases-list">
        {RELEASES.map((r) => (
          <section key={r.version} className="release-card">
            <div className="release-header">
              <h2>{r.version}</h2>
              <span className={`release-status release-status--${r.status}`}>
                {STATUS_LABEL[r.status] || r.status}
              </span>
            </div>
            <ul>
              {r.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
