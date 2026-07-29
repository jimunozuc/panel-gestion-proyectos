import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useIniciativaData } from "../utils/useIniciativaData.js";
import { useSession } from "../utils/SessionContext.jsx";
import { apiFetch } from "../utils/api.js";
import EditNodoModal from "../components/EditNodoModal.jsx";
import AddNodoModal from "../components/AddNodoModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import {
  allNodes,
  fmtDate,
  initials,
  lineMeta,
  monthName,
  personColor,
  statusOf,
  STATUS_META,
} from "../utils/dashboard.js";

const isLeaf = (n) => n.kind === "act" || (n.kind === "init" && !n.activities?.length);

export default function ListadoHitos() {
  const { sheetId } = useOutletContext();
  const { user, ensureSession } = useSession();
  const { loading, error, data, reload } = useIniciativaData(sheetId);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Antes de identificarse no sabemos el rol todavía (optimista: se muestran
  // los controles y, si resulta ser lector, el backend lo rechaza al
  // confirmar sesión). Una vez logueado, un lector no debe ver ni siquiera
  // el botón — no hay nada que su login pueda desbloquear.
  const canEdit = !user || user.rol !== "lector";

  const items = useMemo(() => {
    if (!data) return [];
    return allNodes(data.tree)
      .filter(isLeaf)
      .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
  }, [data]);

  const iniciativaOptions = useMemo(() => {
    if (!data) return [];
    return allNodes(data.tree)
      .filter((n) => n.kind === "init")
      .map((n) => ({ value: n.row, label: `${n.line} · ${n.nombre}` }));
  }, [data]);

  const byMonth = {};
  items.forEach((h) => {
    const key = h.inicio ? h.inicio.slice(0, 7) : "—";
    (byMonth[key] = byMonth[key] || []).push(h);
  });
  const monthKeys = Object.keys(byMonth).sort();
  const monthLabel = (key) => {
    if (key === "—") return "Sin fecha";
    const [y, mo] = key.split("-");
    return monthName((Number(y) - 2026) * 12 + (Number(mo) - 1), 2026);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await ensureSession();
      await apiFetch(`/api/nodos/${deleting.row}`, { method: "DELETE" });
      setDeleting(null);
      reload();
    } catch (err) {
      if (err.message !== "cancelado") setDeleteError(err.message || "No se pudo eliminar");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="vista hitos-page">
      {loading && <p className="subtitle">Cargando datos...</p>}
      {error && <p className="subtitle">No se pudo cargar el archivo: {error}</p>}

      {data && (
        <>
          <div className="hitos-toolbar">
            <p className="data-updated-at">
              Datos actualizados: {new Date(data.updatedAt).toLocaleString("es-CL")}
            </p>
            {data.editable && canEdit && (
              <button type="button" className="hitos-add-btn" onClick={() => setAdding(true)}>
                <span className="material-symbols-rounded" aria-hidden="true">
                  add
                </span>
                Agregar
              </button>
            )}
          </div>
          <div className="hitos-timeline">
            {monthKeys.map((key) => (
              <div key={key} className="hitos-month-group">
                <div className="hitos-month-label">
                  <span className="hitos-month-dot" />
                  {monthLabel(key)}
                </div>
                <div className="hitos-month-items">
                  {byMonth[key].map((h) => {
                    const meta = lineMeta(h.line);
                    const status = STATUS_META[statusOf(h.avance)];
                    const isHito = h.tipo === "Hito";
                    return (
                      <div key={h.row} className="hito-card">
                        <span className="hito-marker" style={{ background: meta.c }} />
                        <div className="hito-info">
                          <div className="hito-name">
                            {h.nombre}
                            <span className={`hito-type-badge hito-type-badge--${isHito ? "hito" : "tarea"}`}>
                              {h.tipo}
                            </span>
                          </div>
                          <div className="hito-sub">
                            {meta.label}
                            {h.parent ? ` · ${h.parent}` : ""}
                          </div>
                        </div>
                        <span
                          className="hito-avatar"
                          style={{ background: personColor(h.responsable, data.team) }}
                          title={h.responsable || "Sin responsable"}
                        >
                          {initials(h.responsable)}
                        </span>
                        <span className="hito-date">{fmtDate(h.inicio)}</span>
                        <span
                          className="hito-status"
                          style={{ background: status.soft, color: status.c }}
                        >
                          {status.label}
                        </span>
                        {data.editable && canEdit && (
                          <span className="hito-actions">
                            <button
                              type="button"
                              className="hito-edit-btn"
                              onClick={() => setEditing(h)}
                              aria-label={`Editar ${h.nombre}`}
                            >
                              <span className="material-symbols-rounded" aria-hidden="true">
                                edit
                              </span>
                            </button>
                            <button
                              type="button"
                              className="hito-delete-btn"
                              onClick={() => setDeleting(h)}
                              aria-label={`Eliminar ${h.nombre}`}
                            >
                              <span className="material-symbols-rounded" aria-hidden="true">
                                delete
                              </span>
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {monthKeys.length === 0 && (
              <p className="subtitle">Todavía no hay hitos ni tareas cargados para esta hoja.</p>
            )}
          </div>
        </>
      )}

      {editing && (
        <EditNodoModal node={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {adding && (
        <AddNodoModal
          sheetId={sheetId}
          iniciativas={iniciativaOptions}
          onClose={() => setAdding(false)}
          onSaved={reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Eliminar ${(deleting.tipo || "elemento").toLowerCase()}`}
          message={`¿Eliminar "${deleting.nombre}"? Esta acción no se puede deshacer.`}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
