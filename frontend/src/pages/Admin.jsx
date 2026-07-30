import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";
import { useSession } from "../utils/SessionContext.jsx";
import { OBJETIVOS, getIniciativas } from "../data/plan.js";

const ROLES = ["administrador", "editor", "lector"];

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CL");
}

function parseSolicitud(entry) {
  try {
    return JSON.parse(entry.valor_nuevo);
  } catch {
    return null;
  }
}

function labelEje(ejeId) {
  return OBJETIVOS.find((o) => o.id === ejeId)?.label || ejeId;
}

function labelIniciativa(ejeId, iniciativaId) {
  return getIniciativas(ejeId).find((i) => i.id === iniciativaId)?.label || iniciativaId;
}

const SOLICITUD_INICIAL = { ejeId: "", iniciativaId: "", nombre: "", responsable: "", descripcion: "" };

export default function Admin() {
  const { user, loading: sessionLoading } = useSession();
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [solicitudForm, setSolicitudForm] = useState(SOLICITUD_INICIAL);
  const [solicitudSaving, setSolicitudSaving] = useState(false);
  const [solicitudError, setSolicitudError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch("/api/admin/users"),
      apiFetch("/api/audit-log?limit=200&entityType=nodo"),
      apiFetch("/api/audit-log?limit=200&entityType=proyecto_solicitud"),
    ])
      .then(([usersData, logData, solicitudesData]) => {
        setUsers(usersData);
        setLog(logData);
        setSolicitudes(solicitudesData);
      })
      .catch((err) => setError(err.message || "No se pudo cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!sessionLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, user]);

  const changeRol = async (id, rol) => {
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ rol }) });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    } catch (err) {
      setError(err.message || "No se pudo cambiar el rol");
    } finally {
      setSavingId(null);
    }
  };

  const setSolicitudField = (field) => (e) =>
    setSolicitudForm((f) => ({
      ...f,
      [field]: e.target.value,
      ...(field === "ejeId" ? { iniciativaId: "" } : {}),
    }));

  const submitSolicitud = async (e) => {
    e.preventDefault();
    setSolicitudSaving(true);
    setSolicitudError(null);
    try {
      await apiFetch("/api/admin/proyecto-solicitudes", {
        method: "POST",
        body: JSON.stringify(solicitudForm),
      });
      setSolicitudForm(SOLICITUD_INICIAL);
      load();
    } catch (err) {
      setSolicitudError(err.message || "No se pudo enviar la solicitud");
    } finally {
      setSolicitudSaving(false);
    }
  };

  if (!sessionLoading && !user) {
    return (
      <div className="vista admin-page">
        <p className="subtitle">Identifícate para entrar a la administración.</p>
      </div>
    );
  }

  if (!sessionLoading && user && user.rol !== "administrador") {
    return (
      <div className="vista admin-page">
        <p className="subtitle">Esta vista es solo para usuarios administradores.</p>
      </div>
    );
  }

  const iniciativasDisponibles = solicitudForm.ejeId ? getIniciativas(solicitudForm.ejeId) : [];

  return (
    <div className="vista admin-page">
      <p className="subtitle">Usuarios, roles y bitácora de cambios del panel.</p>
      {loading && <p className="subtitle">Cargando...</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && (
        <>
          <section className="admin-section">
            <h3>Usuarios y tipos de acceso</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Rol</th>
                    <th>Desde</th>
                    <th>Última conexión</th>
                    <th>Última acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>
                        <select
                          value={u.rol}
                          disabled={savingId === u.id}
                          onChange={(e) => changeRol(u.id, e.target.value)}
                          className="admin-role-select"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{fmtDateTime(u.created_at)}</td>
                      <td>{fmtDateTime(u.last_login_at)}</td>
                      <td>{u.last_action ? `${u.last_action} · ${fmtDateTime(u.last_action_at)}` : "—"}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5}>Todavía no hay usuarios registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h3>Solicitar nuevo proyecto</h3>
            <p className="subtitle">
              El alta real (agregarlo al Plan con datos reales) la revisa un administrador del
              repositorio aparte — esto solo deja la solicitud registrada.
            </p>
            <form className="edit-nodo-form admin-solicitud-form" onSubmit={submitSolicitud}>
              <div className="edit-nodo-row">
                <label className="edit-nodo-field">
                  Objetivo
                  <select value={solicitudForm.ejeId} onChange={setSolicitudField("ejeId")} disabled={solicitudSaving} required>
                    <option value="" disabled>
                      Selecciona un objetivo
                    </option>
                    {OBJETIVOS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="edit-nodo-field">
                  Iniciativa
                  <select
                    value={solicitudForm.iniciativaId}
                    onChange={setSolicitudField("iniciativaId")}
                    disabled={solicitudSaving || !solicitudForm.ejeId}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una iniciativa
                    </option>
                    {iniciativasDisponibles.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="edit-nodo-field">
                Nombre del proyecto
                <input value={solicitudForm.nombre} onChange={setSolicitudField("nombre")} disabled={solicitudSaving} required />
              </label>
              <label className="edit-nodo-field">
                Responsable propuesto
                <input value={solicitudForm.responsable} onChange={setSolicitudField("responsable")} disabled={solicitudSaving} />
              </label>
              <label className="edit-nodo-field">
                Descripción breve
                <textarea value={solicitudForm.descripcion} onChange={setSolicitudField("descripcion")} disabled={solicitudSaving} />
              </label>
              {solicitudError && <p className="session-modal-error">{solicitudError}</p>}
              <div className="session-modal-actions">
                <button type="submit" className="session-modal-submit" disabled={solicitudSaving}>
                  {solicitudSaving ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Solicitante</th>
                    <th>Objetivo</th>
                    <th>Iniciativa</th>
                    <th>Proyecto propuesto</th>
                    <th>Responsable propuesto</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((entry) => {
                    const s = parseSolicitud(entry);
                    return (
                      <tr key={entry.id}>
                        <td>{fmtDateTime(entry.created_at)}</td>
                        <td>{entry.user_nombre}</td>
                        <td>{s ? labelEje(s.ejeId) : "—"}</td>
                        <td>{s ? labelIniciativa(s.ejeId, s.iniciativaId) : entry.sheet_id || "—"}</td>
                        <td>{s?.nombre || entry.campo || "—"}</td>
                        <td>{s?.responsable || "—"}</td>
                        <td>{s?.descripcion || "—"}</td>
                      </tr>
                    );
                  })}
                  {solicitudes.length === 0 && (
                    <tr>
                      <td colSpan={7}>Todavía no hay solicitudes de nuevos proyectos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h3>Bitácora de cambios</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Hoja</th>
                    <th>Acción</th>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Después</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((entry) => (
                    <tr key={entry.id}>
                      <td>{fmtDateTime(entry.created_at)}</td>
                      <td>{entry.user_nombre}</td>
                      <td>{entry.sheet_id}</td>
                      <td>{entry.accion}</td>
                      <td>{entry.campo || "—"}</td>
                      <td>{entry.valor_anterior ?? "—"}</td>
                      <td>{entry.valor_nuevo ?? "—"}</td>
                    </tr>
                  ))}
                  {log.length === 0 && (
                    <tr>
                      <td colSpan={7}>Todavía no hay cambios registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
