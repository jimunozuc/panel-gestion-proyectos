import { Fragment } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { OBJETIVOS, findProyecto } from "../data/plan.js";
import { useSession } from "../utils/SessionContext.jsx";
import ucLogo from "../assets/uc-logo-blanco.png";

function useNavContext() {
  const { ejeId: paramEjeId, proyectoId } = useParams();
  const location = useLocation();
  const isContextoRoute = location.pathname === "/contexto";
  const isSeguimientoRoute = location.pathname === "/seguimiento";
  const isAdminRoute = location.pathname === "/admin";
  const proyecto = proyectoId ? findProyecto(proyectoId) : null;
  const ejeId = paramEjeId || proyecto?.eje.id || null;
  const eje = OBJETIVOS.find((o) => o.id === ejeId) || null;
  return { ejeId, eje, isContextoRoute, isSeguimientoRoute, isAdminRoute, proyectoId, proyecto };
}

export default function PanelLayout() {
  const { ejeId, eje, isContextoRoute, isSeguimientoRoute, isAdminRoute, proyectoId, proyecto } = useNavContext();
  const { user, logout } = useSession();

  const crumbs = [];
  if (isContextoRoute) {
    crumbs.push({ label: "Contexto institucional", to: null });
  } else if (isSeguimientoRoute) {
    crumbs.push({ label: "Seguimiento", to: null });
  } else if (isAdminRoute) {
    crumbs.push({ label: "Administración", to: null });
  } else if (eje) {
    crumbs.push({ label: eje.label, to: proyectoId ? `/ejes/${eje.id}` : null });
    if (proyectoId && proyecto) {
      crumbs.push({ label: proyecto.iniciativa.label, to: null });
      crumbs.push({ label: proyecto.proyecto.label, to: null });
    }
  }

  return (
    <div className="nav-shell">
      <aside className="nav-rail" aria-label="Objetivos estratégicos">
        <div className="nav-rail-brand">
          <img src={ucLogo} alt="Pontificia Universidad Católica de Chile" className="nav-rail-logo" />
        </div>
        <ul className="nav-rail-list">
          <li className={`nav-rail-item nav-rail-item--intro${isContextoRoute ? " nav-rail-item--active" : ""}`}>
            <Link to="/contexto" className="nav-rail-link">
              <span className="material-symbols-rounded" aria-hidden="true">
                school
              </span>
              <span className="nav-rail-label">Contexto</span>
            </Link>
          </li>
          <li className={`nav-rail-item nav-rail-item--intro${isSeguimientoRoute ? " nav-rail-item--active" : ""}`}>
            <Link to="/seguimiento" className="nav-rail-link">
              <span className="material-symbols-rounded" aria-hidden="true">
                insights
              </span>
              <span className="nav-rail-label">Seguimiento</span>
            </Link>
          </li>
        </ul>
        <ul className="nav-rail-list nav-rail-list--objetivos">
          {OBJETIVOS.map((o) => {
            const active = o.id === ejeId;
            const itemClass = [
              "nav-rail-item",
              active ? "nav-rail-item--active" : "",
              !o.enabled ? "nav-rail-item--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const inner = (
              <>
                <span className="nav-rail-num">{o.numero}</span>
                <span className="nav-rail-label">{o.label}</span>
              </>
            );
            return (
              <li key={o.id} className={itemClass}>
                {o.enabled ? (
                  <Link to={`/ejes/${o.id}`} className="nav-rail-link">
                    {inner}
                  </Link>
                ) : (
                  <span className="nav-rail-link" aria-disabled="true">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="nav-rail-footer">
          {user && (
            <div className="nav-rail-session">
              <span className="nav-rail-session-name">{user.nombre}</span>
              <button type="button" className="nav-rail-session-logout" onClick={logout}>
                Salir
              </button>
            </div>
          )}
          {user?.rol === "administrador" && (
            <Link to="/admin" className="nav-rail-footer-link">
              Administración
            </Link>
          )}
          <Link to="/app-releases" className="nav-rail-footer-link">
            App Releases
          </Link>
        </div>
      </aside>

      <div className="nav-content">
        <div className="nav-content-inner">
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span className="breadcrumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
                {c.to ? (
                  <Link to={c.to} className="breadcrumb-link">
                    {c.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
          <div className="content-card">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
