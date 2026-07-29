import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTodosLosProyectosReales } from "../data/plan.js";
import { useMultipleIniciativaData } from "../utils/useIniciativaData.js";
import {
  allNodes,
  fmtDate,
  initials,
  leavesOf,
  personColor,
  STATUS_META,
  statusOf,
} from "../utils/dashboard.js";

const TIPO_TABS = [
  { value: "todos", label: "Todas" },
  { value: "hito", label: "Hitos" },
  { value: "tarea", label: "Actividades" },
];

const SORTABLE = {
  avance: (n) => Number(n.avance) || 0,
  inicio: (n) => n.inicio || "",
  responsable: (n) => (n.responsable || "").toLocaleLowerCase("es-CL"),
  proyecto: (n) => (n.proyectoLabel || "").toLocaleLowerCase("es-CL"),
  linea: (n) => (n.line || "").toLocaleLowerCase("es-CL"),
};

const TEXT_SORT_COLS = new Set(["responsable", "proyecto", "linea"]);

function ResizableTh({ width, onResizeStart, children }) {
  return (
    <th style={{ width }} className="st-th-resizable">
      {children}
      <span className="st-col-resize" onMouseDown={onResizeStart} aria-hidden="true" />
    </th>
  );
}

const FILTER_DEFAULTS = { tipo: "todos", proyectoId: "todos", estado: "todos", responsable: "todos" };

const DEFAULT_COL_WIDTHS = {
  nombre: 220,
  tipo: 90,
  proyecto: 220,
  linea: 160,
  responsable: 170,
  inicio: 110,
  avance: 140,
  estado: 110,
};

const MIN_COL_WIDTH = 70;

export default function SeguimientoTareas() {
  const entries = useMemo(() => getTodosLosProyectosReales(), []);
  const sheetIds = useMemo(() => entries.map((e) => e.proyecto.sheetId), [entries]);
  const { loading, dataById } = useMultipleIniciativaData(sheetIds);

  const [tipo, setTipo] = useState(FILTER_DEFAULTS.tipo);
  const [proyectoId, setProyectoId] = useState(FILTER_DEFAULTS.proyectoId);
  const [estado, setEstado] = useState(FILTER_DEFAULTS.estado);
  const [responsable, setResponsable] = useState(FILTER_DEFAULTS.responsable);
  const [sortBy, setSortBy] = useState("inicio");
  const [sortDir, setSortDir] = useState("asc");
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);

  // Cada arrastre crea su propio par de listeners (cierran sobre el ancho
  // inicial de ESE gesto) y se desregistra a sí mismo al soltar — evita
  // depender de identidades de función estables entre renders.
  const startResize = (col) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[col];
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      const next = Math.max(MIN_COL_WIDTH, Math.round(startWidth + (ev.clientX - startX)));
      setColWidths((w) => ({ ...w, [col]: next }));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const filtersChanged =
    tipo !== FILTER_DEFAULTS.tipo ||
    proyectoId !== FILTER_DEFAULTS.proyectoId ||
    estado !== FILTER_DEFAULTS.estado ||
    responsable !== FILTER_DEFAULTS.responsable;

  const resetFilters = () => {
    setTipo(FILTER_DEFAULTS.tipo);
    setProyectoId(FILTER_DEFAULTS.proyectoId);
    setEstado(FILTER_DEFAULTS.estado);
    setResponsable(FILTER_DEFAULTS.responsable);
  };

  const allLeaves = useMemo(() => {
    return entries.flatMap((e) => {
      const data = dataById[e.proyecto.sheetId];
      if (!data) return [];
      return leavesOf(allNodes(data.tree)).map((n) => ({
        ...n,
        proyectoId: e.proyecto.id,
        proyectoLabel: e.proyecto.label,
        proyectoRoute: e.proyecto.route,
      }));
    });
  }, [entries, dataById]);

  const responsables = useMemo(
    () => [...new Set(allLeaves.map((n) => n.responsable).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es-CL")),
    [allLeaves]
  );

  const team = responsables;

  const filtered = useMemo(() => {
    return allLeaves.filter((n) => {
      if (tipo === "hito" && n.tipo !== "Hito") return false;
      if (tipo === "tarea" && n.tipo === "Hito") return false;
      if (proyectoId !== "todos" && n.proyectoId !== proyectoId) return false;
      if (estado !== "todos" && statusOf(n.avance) !== estado) return false;
      if (responsable !== "todos" && n.responsable !== responsable) return false;
      return true;
    });
  }, [allLeaves, tipo, proyectoId, estado, responsable]);

  const sorted = useMemo(() => {
    const key = SORTABLE[sortBy];
    if (!key) return filtered;
    const arr = [...filtered].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [filtered, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(TEXT_SORT_COLS.has(col) ? "asc" : "desc");
    }
  };

  const sortIcon = (col) => {
    if (sortBy !== col) return "unfold_more";
    return sortDir === "asc" ? "arrow_upward" : "arrow_downward";
  };

  return (
    <div className="vista seguimiento-tareas-page">
      <h1>Todas las tareas</h1>
      <p className="subtitle">
        Hitos y actividades de todos los proyectos reales del Plan, con filtros y orden.
      </p>

      {loading && <p className="subtitle">Cargando datos...</p>}

      {!loading && (
        <>
          <div className="st-tabs" role="tablist" aria-label="Filtrar por tipo">
            {TIPO_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tipo === t.value}
                className={`st-tab${tipo === t.value ? " st-tab--active" : ""}`}
                onClick={() => setTipo(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="st-filters">
            <label className="st-filter">
              <span>Proyecto</span>
              <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
                <option value="todos">Todos</option>
                {entries.map((en) => (
                  <option key={en.proyecto.id} value={en.proyecto.id}>
                    {en.proyecto.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="st-filter">
              <span>Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="todos">Todos</option>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="st-filter">
              <span>Responsable</span>
              <select value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                <option value="todos">Todos</option>
                {responsables.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {filtersChanged && (
              <button type="button" className="st-reset-btn" onClick={resetFilters}>
                <span className="material-symbols-rounded" aria-hidden="true">
                  filter_alt_off
                </span>
                Restablecer filtros
              </button>
            )}

            <span className="st-count">
              {sorted.length} {sorted.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>

          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <ResizableTh width={colWidths.nombre} onResizeStart={startResize("nombre")}>
                    Nombre
                  </ResizableTh>
                  <ResizableTh width={colWidths.tipo} onResizeStart={startResize("tipo")}>
                    Tipo
                  </ResizableTh>
                  <ResizableTh width={colWidths.proyecto} onResizeStart={startResize("proyecto")}>
                    <button type="button" className="st-sort-btn" onClick={() => toggleSort("proyecto")}>
                      Proyecto
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {sortIcon("proyecto")}
                      </span>
                    </button>
                  </ResizableTh>
                  <ResizableTh width={colWidths.linea} onResizeStart={startResize("linea")}>
                    <button type="button" className="st-sort-btn" onClick={() => toggleSort("linea")}>
                      Línea
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {sortIcon("linea")}
                      </span>
                    </button>
                  </ResizableTh>
                  <ResizableTh width={colWidths.responsable} onResizeStart={startResize("responsable")}>
                    <button type="button" className="st-sort-btn" onClick={() => toggleSort("responsable")}>
                      Responsable
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {sortIcon("responsable")}
                      </span>
                    </button>
                  </ResizableTh>
                  <ResizableTh width={colWidths.inicio} onResizeStart={startResize("inicio")}>
                    <button type="button" className="st-sort-btn" onClick={() => toggleSort("inicio")}>
                      Fecha inicio
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {sortIcon("inicio")}
                      </span>
                    </button>
                  </ResizableTh>
                  <ResizableTh width={colWidths.avance} onResizeStart={startResize("avance")}>
                    <button type="button" className="st-sort-btn" onClick={() => toggleSort("avance")}>
                      Avance
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {sortIcon("avance")}
                      </span>
                    </button>
                  </ResizableTh>
                  <ResizableTh width={colWidths.estado} onResizeStart={startResize("estado")}>
                    Estado
                  </ResizableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((n, idx) => {
                  const meta = STATUS_META[statusOf(n.avance)];
                  return (
                    <tr key={`${n.proyectoId}-${n.row}-${idx}`}>
                      <td>
                        <Link to={`${n.proyectoRoute}/listado-hitos`} className="st-task-link">
                          {n.nombre}
                        </Link>
                      </td>
                      <td>
                        <span className={`hito-type-badge hito-type-badge--${n.tipo === "Hito" ? "hito" : "tarea"}`}>
                          {n.tipo}
                        </span>
                      </td>
                      <td>{n.proyectoLabel}</td>
                      <td>{n.line}</td>
                      <td>
                        {n.responsable ? (
                          <span className="st-responsable">
                            <span className="hito-avatar" style={{ background: personColor(n.responsable, team) }}>
                              {initials(n.responsable)}
                            </span>
                            {n.responsable}
                          </span>
                        ) : (
                          <span className="st-empty">—</span>
                        )}
                      </td>
                      <td>{fmtDate(n.inicio)}</td>
                      <td>
                        <div className="st-avance">
                          <div className="kpi-bar-track kpi-bar-track--thin">
                            <div className="kpi-bar-fill" style={{ width: `${n.avance}%`, background: meta.c }} />
                          </div>
                          <span>{n.avance}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="hito-status" style={{ background: meta.soft, color: meta.c }}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="st-empty-row">
                      Ningún resultado con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
