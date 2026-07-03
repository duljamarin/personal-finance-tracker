import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { useToast } from '../../context/ToastContext';

// Shown exactly once, right after encryption setup. Cannot be dismissed
// without an explicit "I saved it" confirmation — this code is the only way
// back into encrypted data after a password reset, and it is never shown
// again.
export default function RecoveryCodeModal({ recoveryCode, onDone }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob(
      [`${t('encryption.recoveryFileHeader')}\n\n${recoveryCode}\n\n${t('encryption.recoveryFileFooter')}`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-tracker-recovery-code.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast(t('encryption.recoveryDownloaded'), 'success');
  }

  return (
    <Modal onClose={() => {}}>
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white">
          {t('encryption.recoveryCodeTitle')}
        </h2>
        <p className="text-sm text-ink-muted dark:text-white/70">
          {t('encryption.recoveryCodeDesc')}
        </p>

        <div className="border border-surface-hairline dark:border-surface-dark-hairline rounded-md p-4 bg-surface-subtle dark:bg-surface-dark-subtle">
          <div className="font-mono text-base tracking-wider text-ink-primary dark:text-white text-center break-all select-all">
            {recoveryCode}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleCopy}>
            {copied ? t('encryption.copied') : t('encryption.copyCode')}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={handleDownload}>
            {t('encryption.downloadCode')}
          </Button>
        </div>

        <label className="flex items-start gap-2 text-sm text-ink-secondary dark:text-white cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          {t('encryption.recoveryCodeConfirm')}
        </label>

        <Button disabled={!confirmed} onClick={onDone}>
          {t('encryption.recoveryCodeContinue')}
        </Button>
      </div>
    </Modal>
  );
}
