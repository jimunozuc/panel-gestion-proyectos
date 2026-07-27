import { useState } from "react";
import { apiFetch } from "../utils/api.js";
import { useSession } from "../utils/SessionContext.jsx";

export default function EditNodoModal({ node, onClose, onSaved }) {
  const { ensureSession } = useSession();
  const [form, setForm] = useState({
    nombre: node.nombre || "",
    responsable: node.responsable || "",
    inicio: node.inicio || "",
    fin: node.fin || "",
    avance: node.avance ?? 0,
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
      await apiFetch(`/api/nodos/${node.row}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, avance: Number(form.avance) || 0 }),
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err.message !== "cancelado") setError(err.message || "No se pudo guardar");
      setSaving(false);
    }
  };

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Editar ${node.nombre}`}>
      <div className="session-modal edit-nodo-modal">
        <h2 className="session-modal-title">Editar {(node.tipo || "elemento").toLowerCase()}</h2>
        <form onSubmit={submit} className="edit-nodo-form">
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
              <input type="date" value={form.inicio || ""} onChange={set("inicio")} disabled={saving} />
            </label>
            <label className="edit-nodo-field">
              Fin
              <input type="date" value={form.fin || ""} onChange={set("fin")} disabled={saving} />
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
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
