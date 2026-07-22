import { Link } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { PANEL_PAGES } from "../data/panelPages.js";

export default function Menu() {
  return (
    <main className="page menu-page">
      <BackButton to="/ejes/inteligencia-digital" label="← Volver a Inteligencia digital" />
      <h1>Panel de Gestión</h1>
      <div className="menu-buttons">
        {PANEL_PAGES.map((p) => (
          <Link key={p.slug} to={`/panel-gestion/${p.slug}`} className="menu-button">
            {p.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
