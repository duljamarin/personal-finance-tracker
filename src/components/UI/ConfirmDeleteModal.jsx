import Modal from './Modal';

// Standard alert dialog: left-aligned, the thing being deleted named in full,
// actions bottom-right with the destructive one last. Red lives on the button.
export default function ConfirmDeleteModal({
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  deleting = false,
}) {
  return (
    <Modal onClose={() => !deleting && onCancel()}>
      <div role="alertdialog" aria-modal="true" className="pr-6">
        <h3 className="text-heading text-ink-primary dark:text-white mb-2">
          {title}
        </h3>
        {itemName && (
          <p className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-ink-primary dark:text-white mb-1.5">
            {itemName}
          </p>
        )}
        <p className="text-sm text-ink-muted dark:text-white leading-relaxed">
          {message}
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="px-4 py-2 border border-surface-outline dark:border-surface-dark-outline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white rounded-md font-medium text-sm hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="px-4 py-2 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-danger hover:bg-danger-hover"
        >
          {deleting ? '...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
