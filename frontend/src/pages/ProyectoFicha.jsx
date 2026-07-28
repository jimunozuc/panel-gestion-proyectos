import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { PANEL_PAGES } from "../data/panelPages.js";
import { findProyecto } from "../data/plan.js";

export default function ProyectoFicha() {
  const { proyectoId } = useParams();
  const info = findProyecto(proyectoId);
  const descripcion = info?.proyecto.descripcion;
  const [showInfo, setShowInfo] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    setShowInfo(false);
  }, [proyectoId]);

  useEffect(() => {
    if (!showInfo) return;
    const onClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowInfo(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setShowInfo(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [showInfo]);

  return (
    <div className="ficha">
      <span className="ficha-badge">Proyecto</span>
      <div className="ficha-title-row">
        <h1 className="ficha-title">{info ? info.proyecto.label : "Proyecto"}</h1>
        {descripcion && (
          <div className="ficha-info-wrap" ref={popoverRef}>
            <button
              type="button"
              className="ficha-info-btn"
              aria-expanded={showInfo}
              aria-label={showInfo ? "Ocultar definición del proyecto" : "Ver definición del proyecto"}
              onClick={() => setShowInfo((s) => !s)}
            >
              <span className="material-symbols-rounded" aria-hidden="true">info</span>
            </button>
            {showInfo && (
              <div className="ficha-info-popover" role="tooltip">
                {descripcion}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="ficha-tabs" aria-label="Vistas del proyecto">
        {PANEL_PAGES.map((p) => (
          <NavLink
            key={p.slug}
            to={`/proyectos/${proyectoId}/${p.slug}`}
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
        <Outlet context={{ sheetId: info?.proyecto.sheetId }} />
      </div>
    </div>
  );
}
