import Modal from './Modal';
import Button from './Button';

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
        <h3 className="text-h3 font-bold text-fg mb-2">
          {title}
        </h3>
        {itemName && (
          <p className="min-w-0 [overflow-wrap:anywhere] text-base font-extrabold text-fg mb-1.5">
            {itemName}
          </p>
        )}
        <p className="text-base text-fg">
          {message}
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={deleting} type="button">
          {cancelLabel}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="!bg-danger !border-danger hover:!bg-danger-hover hover:!border-danger-hover"
        >
          {deleting ? '...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
