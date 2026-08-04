import { useMemo, useState, useEffect } from "react";
import { useSession } from "../utils/SessionContext.jsx";
import { apiFetch } from "../utils/api.js";
import { getTodosLosProyectosReales } from "../data/plan.js";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import { allNodes } from "../utils/dashboard.js";
import AddNodoModal from "../components/AddNodoModal.jsx";

const PROYECTOS_REALES = getTodosLosProyectosReales();
const ROLES_VER_COMO = ["administrador", "editor", "lector"];

function AgregarTarea() {
  const [proyectoId, setProyectoId] = useState(PROYECTOS_REALES[0]?.proyecto.id || "");
  const [adding, setAdding] = useState(false);
  const seleccionado = PROYECTOS_REALES.find((p) => p.proyecto.id === proyectoId);
  const sheetId = seleccionado?.proyecto.sheetId;
  const { data } = useIniciativaData(sheetId || "");

  const iniciativaOptions = useMemo(() => {
    if (!data) return [];
    return allNodes(data.tree)
      .filter((n) => n.kind === "init")
      .map((n) => ({ value: n.row, label: `${n.line} · ${n.nombre}` }));
  }, [data]);

  if (PROYECTOS_REALES.length === 0) return null;

  return (
    <section className="admin-section">
      <h3>Agregar tarea</h3>
      <div className="edit-nodo-row">
        <label className="edit-nodo-field">
          Proyecto
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            {PROYECTOS_REALES.map(({ proyecto }) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="hitos-add-btn" onClick={() => setAdding(true)} disabled={!sheetId}>
        <span className="material-symbols-rounded" aria-hidden="true">
          add
        </span>
        Agregar tarea a {seleccionado?.proyecto.label}
      </button>
      {adding && (
        <AddNodoModal
          sheetId={sheetId}
          iniciativas={iniciativaOptions}
          onClose={() => setAdding(false)}
          onSaved={() => {}}
        />
      )}
    </section>
  );
}

function VerComo() {
  const { user, verComo, salirVerComo } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cambiar = async (rol) => {
    setSaving(true);
    setError(null);
    try {
      await verComo(rol);
    } catch (err) {
      setError(err.message || "No se pudo cambiar de rol");
    } finally {
      setSaving(false);
    }
  };

  const salir = async () => {
    setSaving(true);
    setError(null);
    try {
      await salirVerComo();
    } catch (err) {
      setError(err.message || "No se pudo salir del modo de prueba");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <h3>Ver como (solo tu cuenta)</h3>
      <p className="subtitle">
        Cambia de verdad el rol que aplica el backend en tu sesión — sirve para revisar que cada rol
        vea y pueda hacer exactamente lo que debería. Queda registrado en la bitácora.
      </p>
      {user.viendoComo && (
        <p className="admin-error" style={{ color: "var(--uc-azul)" }}>
          Ahora mismo estás viendo la app como <strong>{user.rol}</strong> (tu rol real es{" "}
          {user.rolReal}).
        </p>
      )}
      <div className="session-modal-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {ROLES_VER_COMO.map((r) => (
          <button
            key={r}
            type="button"
            className="admin-role-select"
            disabled={saving || user.rol === r}
            onClick={() => cambiar(r)}
          >
            Ver como {r}
          </button>
        ))}
        {user.viendoComo && (
          <button type="button" className="session-modal-cancel" disabled={saving} onClick={salir}>
            Salir del modo de prueba
          </button>
        )}
      </div>
      {error && <p className="session-modal-error">{error}</p>}
    </section>
  );
}

export default function Perfil() {
  const { user, loading: sessionLoading, puedeVerComo } = useSession();
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionLoading || !user) return;
    apiFetch("/api/perfil/resumen")
      .then(setResumen)
      .catch((err) => setError(err.message || "No se pudo cargar tu perfil"));
  }, [sessionLoading, user]);

  if (!sessionLoading && !user) {
    return (
      <div className="vista admin-page">
        <p className="subtitle">Identifícate para ver tu perfil.</p>
      </div>
    );
  }

  return (
    <div className="vista admin-page">
      <p className="subtitle">
        {user?.nombre} · rol {user?.rol}
      </p>
      {error && <p className="admin-error">{error}</p>}

      {resumen && (
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-card-value">{resumen.tareasPendientes}</div>
            <div className="kpi-card-label">Tareas pendientes</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-value">{resumen.proyectosActivos}</div>
            <div className="kpi-card-label">Proyectos activos</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-value">{resumen.hitosRealizados}</div>
            <div className="kpi-card-label">Hitos realizados</div>
          </div>
        </div>
      )}

      {user && user.rol !== "lector" && <AgregarTarea />}
      {puedeVerComo && <VerComo />}
    </div>
  );
}
