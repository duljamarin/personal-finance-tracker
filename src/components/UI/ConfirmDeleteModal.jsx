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
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        {itemName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-200">{itemName}</span>
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? '...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
