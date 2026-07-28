import { useState } from "react";
import { apiFetch } from "../utils/api.js";
import { useSession } from "../utils/SessionContext.jsx";

export default function AddNodoModal({ sheetId, iniciativas, onClose, onSaved }) {
  const { ensureSession } = useSession();
  const [form, setForm] = useState({
    parentId: iniciativas[0]?.value ?? "",
    tipo: "Tarea",
    nombre: "",
    responsable: "",
    inicio: "",
    fin: "",
    avance: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await ensureSession();
      await apiFetch(`/api/iniciativas/${sheetId}/nodos`, {
        method: "POST",
        body: JSON.stringify({
          parentId: Number(form.parentId),
          nombre: form.nombre.trim(),
          tipo: form.tipo,
          responsable: form.responsable,
          inicio: form.inicio || null,
          fin: form.fin || null,
          avance: Number(form.avance) || 0,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err.message !== "cancelado") setError(err.message || "No se pudo guardar");
      setSaving(false);
    }
  };

  if (iniciativas.length === 0) {
    return (
      <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Agregar hito o tarea">
        <div className="session-modal edit-nodo-modal">
          <h2 className="session-modal-title">Agregar hito o tarea</h2>
          <p className="session-modal-desc">
            Todavía no hay iniciativas en esta hoja para agregar un hito o tarea.
          </p>
          <div className="session-modal-actions">
            <button type="button" className="session-modal-cancel" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Agregar ${form.tipo.toLowerCase()}`}>
      <div className="session-modal edit-nodo-modal">
        <h2 className="session-modal-title">Agregar {form.tipo.toLowerCase()}</h2>
        <form onSubmit={submit} className="edit-nodo-form">
          <div className="edit-nodo-row">
            <label className="edit-nodo-field">
              Tipo
              <select value={form.tipo} onChange={set("tipo")} disabled={saving}>
                <option value="Hito">Hito</option>
                <option value="Tarea">Tarea</option>
              </select>
            </label>
            <label className="edit-nodo-field">
              Iniciativa
              <select value={form.parentId} onChange={set("parentId")} disabled={saving}>
                {iniciativas.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="edit-nodo-field">
            Nombre
            <input value={form.nombre} onChange={set("nombre")} disabled={saving} required />
          </label>
          <label className="edit-nodo-field">
            Responsable
            <input value={form.responsable} onChange={set("responsable")} disabled={saving} />
          </label>
          <div className="edit-nodo-row">
            <label className="edit-nodo-field">
              Inicio
              <input type="date" value={form.inicio} onChange={set("inicio")} disabled={saving} />
            </label>
            <label className="edit-nodo-field">
              Fin
              <input type="date" value={form.fin} onChange={set("fin")} disabled={saving} />
            </label>
          </div>
          <label className="edit-nodo-field">
            % Avance
            <input type="number" min="0" max="100" value={form.avance} onChange={set("avance")} disabled={saving} />
          </label>
          {error && <p className="session-modal-error">{error}</p>}
          <div className="session-modal-actions">
            <button type="button" className="session-modal-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="session-modal-submit" disabled={saving}>
              {saving ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
