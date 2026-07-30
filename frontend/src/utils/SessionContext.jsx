import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState(null);
  const [puedeVerComo, setPuedeVerComo] = useState(false);

  const refreshUsers = useCallback(() => {
    apiFetch("/api/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    apiFetch("/api/session")
      .then((data) => {
        setUser(data.user);
        setPuedeVerComo(!!data.puedeVerComo);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    refreshUsers();
  }, [refreshUsers]);

  const login = useCallback(
    async (nombre) => {
      const data = await apiFetch("/api/session/login", {
        method: "POST",
        body: JSON.stringify({ nombre }),
      });
      setUser(data.user);
      setPuedeVerComo(!!data.puedeVerComo);
      refreshUsers();
      return data.user;
    },
    [refreshUsers]
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/session/logout", { method: "POST" });
    setUser(null);
  }, []);

  // "Ver como": cambia de verdad el rol que aplica el backend en esta
  // sesión (auditado del lado del servidor) — solo disponible si
  // puedeVerComo vino en true desde /api/session.
  const verComo = useCallback(async (rol) => {
    const data = await apiFetch("/api/session/ver-como", {
      method: "POST",
      body: JSON.stringify({ rol }),
    });
    const session = await apiFetch("/api/session");
    setUser(session.user);
    return data;
  }, []);

  const salirVerComo = useCallback(async () => {
    await apiFetch("/api/session/ver-como/salir", { method: "POST" });
    const session = await apiFetch("/api/session");
    setUser(session.user);
  }, []);

  // Se resuelve de inmediato si ya hay sesión; si no, abre el modal "¿Quién
  // eres?" y queda pendiente hasta que la persona complete o cancele.
  const ensureSession = useCallback(() => {
    if (user) return Promise.resolve(user);
    return new Promise((resolve, reject) => {
      setPrompt({ resolve, reject });
    });
  }, [user]);

  const handlePromptSubmit = useCallback(
    async (nombre) => {
      const u = await login(nombre);
      prompt?.resolve(u);
      setPrompt(null);
    },
    [login, prompt]
  );

  const handlePromptCancel = useCallback(() => {
    prompt?.reject(new Error("cancelado"));
    setPrompt(null);
  }, [prompt]);

  return (
    <SessionContext.Provider
      value={{ user, users, loading, login, logout, ensureSession, puedeVerComo, verComo, salirVerComo }}
    >
      {children}
      {prompt && (
        <LoginModal onSubmit={handlePromptSubmit} onCancel={handlePromptCancel} users={users} />
      )}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}

function LoginModal({ onSubmit, onCancel, users }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(nombre.trim());
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
      setSubmitting(false);
    }
  };

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Identifícate">
      <div className="session-modal">
        <h2 className="session-modal-title">¿Quién eres?</h2>
        <p className="session-modal-desc">
          Para editar necesitamos saber quién eres — queda registrado en la bitácora de cambios.
        </p>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            className="session-modal-input"
            list="session-users"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            disabled={submitting}
          />
          <datalist id="session-users">
            {users.map((u) => (
              <option key={u.id} value={u.nombre} />
            ))}
          </datalist>
          {error && <p className="session-modal-error">{error}</p>}
          <div className="session-modal-actions">
            <button type="button" className="session-modal-cancel" onClick={onCancel} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="session-modal-submit" disabled={submitting || !nombre.trim()}>
              {submitting ? "Entrando..." : "Continuar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
