export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Eliminar",
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="session-modal">
        <h2 className="session-modal-title">{title}</h2>
        <p className="session-modal-desc">{message}</p>
        {error && <p className="session-modal-error">{error}</p>}
        <div className="session-modal-actions">
          <button type="button" className="session-modal-cancel" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="session-modal-submit session-modal-submit--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
