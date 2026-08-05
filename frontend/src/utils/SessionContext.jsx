import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState(null);
  const [puedeVerComo, setPuedeVerComo] = useState(false);

  useEffect(() => {
    apiFetch("/api/session")
      .then((data) => {
        setUser(data.user);
        setPuedeVerComo(!!data.puedeVerComo);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (correo, password) => {
    const data = await apiFetch("/api/session/login", {
      method: "POST",
      body: JSON.stringify({ correo, password }),
    });
    setUser(data.user);
    setPuedeVerComo(!!data.puedeVerComo);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/session/logout", { method: "POST" });
    setUser(null);
  }, []);

  // Contraseña asignada por un administrador (alta o restablecimiento):
  // must_change_password llega en true y ChangePasswordModal se muestra
  // sola, sin opción de cancelar, hasta que esto resuelva.
  const changePassword = useCallback(async (password) => {
    const data = await apiFetch("/api/session/password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setUser(data.user);
    return data.user;
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

  // Se resuelve de inmediato si ya hay sesión; si no, abre el modal
  // "Identifícate" y queda pendiente hasta que la persona complete o cancele.
  const ensureSession = useCallback(() => {
    if (user) return Promise.resolve(user);
    return new Promise((resolve, reject) => {
      setPrompt({ resolve, reject });
    });
  }, [user]);

  const handlePromptSubmit = useCallback(
    async (correo, password) => {
      const u = await login(correo, password);
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
      value={{ user, loading, login, logout, changePassword, ensureSession, puedeVerComo, verComo, salirVerComo }}
    >
      {children}
      {prompt && <LoginModal onSubmit={handlePromptSubmit} onCancel={handlePromptCancel} />}
      {user?.must_change_password && <ChangePasswordModal onSubmit={changePassword} />}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}

function LoginModal({ onSubmit, onCancel }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!correo.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(correo.trim(), password);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
      setSubmitting(false);
    }
  };

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Identifícate">
      <div className="session-modal">
        <h2 className="session-modal-title">Identifícate</h2>
        <p className="session-modal-desc">
          Ingresa tu correo institucional y tu contraseña. Si un administrador ya te dio de alta,
          entras con el rol que te asignó — queda registrado en la bitácora de cambios.
        </p>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            className="session-modal-input"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu.correo@uc.cl"
            disabled={submitting}
          />
          <input
            className="session-modal-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            disabled={submitting}
          />
          {error && <p className="session-modal-error">{error}</p>}
          <div className="session-modal-actions">
            <button type="button" className="session-modal-cancel" onClick={onCancel} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="session-modal-submit" disabled={submitting || !correo.trim() || !password}>
              {submitting ? "Entrando..." : "Continuar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sin botón cancelar a propósito: la contraseña la asignó un administrador
// (ver Admin.jsx, "Dar de alta"/"Restablecer"), no es opcional cambiarla.
function ChangePasswordModal({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña");
      setSubmitting(false);
    }
  };

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Cambia tu contraseña">
      <div className="session-modal">
        <h2 className="session-modal-title">Cambia tu contraseña</h2>
        <p className="session-modal-desc">
          Tu cuenta tiene una contraseña temporal asignada por un administrador — elige una propia
          antes de continuar.
        </p>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            className="session-modal-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            disabled={submitting}
          />
          <input
            className="session-modal-input"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repite la contraseña"
            disabled={submitting}
          />
          {error && <p className="session-modal-error">{error}</p>}
          <div className="session-modal-actions">
            <button type="submit" className="session-modal-submit" disabled={submitting || !password || !confirmar}>
              {submitting ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
