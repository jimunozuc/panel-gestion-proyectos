import { NavLink, Outlet } from "react-router-dom";
import { PANEL_PAGES } from "../data/panelPages.js";
import { findProyectoActivo } from "../data/plan.js";

export default function ProyectoFicha() {
  const proyecto = findProyectoActivo();

  return (
    <div className="ficha">
      <span className="ficha-badge">Proyecto</span>
      <h1 className="ficha-title">{proyecto ? proyecto.iniciativa.label : "Proyecto"}</h1>

      <nav className="ficha-tabs" aria-label="Vistas del proyecto">
        {PANEL_PAGES.map((p) => (
          <NavLink
            key={p.slug}
            to={`/panel-gestion/${p.slug}`}
            className={({ isActive }) => `ficha-tab${isActive ? " ficha-tab--active" : ""}`}
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              {p.icon}
            </span>
            {p.label}
          </NavLink>
        ))}
      </nav>

      <div className="ficha-view">
        <Outlet />
      </div>
    </div>
  );
}
