import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";
import { useSession } from "../utils/SessionContext.jsx";

const ROLES = ["administrador", "editor", "lector"];

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CL");
}

export default function Admin() {
  const { user, loading: sessionLoading } = useSession();
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([apiFetch("/api/admin/users"), apiFetch("/api/audit-log?limit=200")])
      .then(([usersData, logData]) => {
        setUsers(usersData);
        setLog(logData);
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
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Desde</th>
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
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3}>Todavía no hay usuarios registrados.</td>
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
