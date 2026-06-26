import Modal from './Modal';
import Button from './Button';

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
      <div className="text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-expense-tint">
          <svg className="w-7 h-7 text-expense" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-2">
          {title}
        </h3>
        {itemName && (
          <p className="text-sm text-ink-muted dark:text-white mb-2">
            <span className="font-medium text-ink-secondary dark:text-white">{itemName}</span>
          </p>
        )}
        <p className="text-sm text-ink-secondary dark:text-white mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white rounded-md font-medium text-sm hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-white rounded-md font-medium text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed bg-danger hover:bg-danger-hover"
          >
            {deleting ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
