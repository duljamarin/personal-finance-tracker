import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { useDisplayCurrency, notifyCurrencyChanged } from '../../hooks/useDisplayCurrency';
import { fetchExchangeRate } from '../../utils/exchangeRate';
import { convertAllAmounts, getPendingConversion } from '../../utils/currencyConversion';
import { CURRENCY_SYMBOLS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];

const selectClass =
  'appearance-none w-full px-3 py-2.5 pr-10 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition';

export default function CurrencySettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { currency: current } = useDisplayCurrency();
  const { reloadTransactions } = useTransactions();

  const [target, setTarget] = useState(current);
  const [rate, setRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [pending, setPending] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  // Keep the dropdown in sync once the real currency resolves.
  useEffect(() => { setTarget(current); }, [current]);

  // An interrupted run must be finished before anything else is allowed —
  // half-converted data plus a new conversion is unrecoverable.
  useEffect(() => {
    if (!user?.id) return;
    getPendingConversion(user.id)
      .then((p) => { if (mounted.current) setPending(p); })
      .catch(() => {});
  }, [user?.id]);

  // Preview the rate as soon as a different currency is picked, so the modal can
  // show a real before/after instead of an abstract promise.
  useEffect(() => {
    if (target === current) { setRate(null); return; }
    let cancelled = false;
    setLoadingRate(true);
    Promise.all([fetchExchangeRate(current), fetchExchangeRate(target)])
      .then(([fromEurPerUnit, toEurPerUnit]) => {
        if (cancelled || !mounted.current) return;
        // fetchExchangeRate gives EUR per 1 unit. current -> target is therefore
        // (EUR per current) / (EUR per target).
        const f = current === 'EUR' ? 1 : fromEurPerUnit;
        const tg = target === 'EUR' ? 1 : toEurPerUnit;
        setRate(f && tg ? f / tg : null);
      })
      .catch(() => { if (!cancelled && mounted.current) setRate(null); })
      .finally(() => { if (!cancelled && mounted.current) setLoadingRate(false); });
    return () => { cancelled = true; };
  }, [target, current]);

  async function runConversion(params) {
    setConverting(true);
    setConfirmOpen(false);
    try {
      const result = await convertAllAmounts(user.id, params, (p) => {
        if (mounted.current) setProgress(p);
      });

      if (result === 'busy') {
        addToast(t('settings.currency.busy'), 'error');
        return;
      }

      notifyCurrencyChanged(params.to);
      setPending(null);
      await reloadTransactions?.();
      addToast(t('settings.currency.success', { currency: params.to }), 'success');
    } catch (err) {
      console.error('currency conversion failed', err);
      // The cursor survives in the DB, so the next visit resumes rather than
      // restarting — tell the user it is recoverable, not lost.
      addToast(t('settings.currency.error'), 'error');
      getPendingConversion(user.id)
        .then((p) => { if (mounted.current) setPending(p); })
        .catch(() => {});
    } finally {
      if (mounted.current) {
        setConverting(false);
        setProgress(null);
      }
    }
  }

  const sampleFrom = 1000;
  const sampleTo = rate ? sampleFrom * rate : null;

  if (pending) {
    return (
      <Card padding="lg" className="border border-expense/40">
        <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-2">
          {t('settings.currency.title')}
        </h2>
        <p className="text-sm text-ink-secondary dark:text-white/80 mb-4">
          {t('settings.currency.resumeDesc', { from: pending.from, to: pending.to })}
        </p>
        <Button
          onClick={() => runConversion({ from: pending.from, to: pending.to, rate: pending.rate })}
          disabled={converting}
        >
          {converting ? t('settings.currency.converting') : t('settings.currency.resume')}
        </Button>
        {converting && progress && (
          <p className="text-xs text-ink-muted dark:text-white/60 mt-3">
            {t('settings.currency.progress', { done: progress.done, total: progress.total })}
          </p>
        )}
      </Card>
    );
  }

  return (
    <>
      <Card padding="lg" className="border border-surface-hairline dark:border-surface-dark-hairline">
        <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-2">
          {t('settings.currency.title')}
        </h2>
        <p className="text-sm text-ink-muted dark:text-white/70 mb-4">
          {t('settings.currency.description')}
        </p>

        <div className="relative max-w-xs">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={converting}
            className={selectClass}
            aria-label={t('settings.currency.title')}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {t(`currency.${code}`)} ({CURRENCY_SYMBOLS[code] || code})
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted dark:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {target !== current && (
          <div className="mt-4">
            <Button onClick={() => setConfirmOpen(true)} disabled={converting || loadingRate || !rate}>
              {converting ? t('settings.currency.converting') : t('settings.currency.change')}
            </Button>
            {loadingRate && (
              <p className="text-xs text-ink-muted dark:text-white/60 mt-2">
                {t('settings.currency.loadingRate')}
              </p>
            )}
            {!loadingRate && !rate && (
              <p className="text-xs text-expense mt-2">{t('settings.currency.rateError')}</p>
            )}
          </div>
        )}

        {converting && (
          <div className="mt-4 flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-ink-secondary dark:text-white/80">
              {progress
                ? t('settings.currency.progress', { done: progress.done, total: progress.total })
                : t('settings.currency.converting')}
            </p>
          </div>
        )}
      </Card>

      {confirmOpen && (
      <Modal onClose={() => setConfirmOpen(false)}>
        <div className="p-6">
          <h3 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-3">
            {t('settings.currency.confirmTitle', { from: current, to: target })}
          </h3>

          <p className="text-sm text-ink-secondary dark:text-white/80 mb-4">
            {t('settings.currency.confirmBody')}
          </p>

          {sampleTo !== null && (
            <div className="bg-surface-subtle dark:bg-surface-dark-subtle rounded-md p-3 mb-4 text-sm">
              <span className="text-ink-muted dark:text-white/70">
                {t('settings.currency.example')}:{' '}
              </span>
              <span className="font-semibold tabular-nums text-ink-primary dark:text-white">
                {formatCurrency(sampleFrom, current)} → {formatCurrency(sampleTo, target)}
              </span>
            </div>
          )}

          <p className="text-xs text-ink-muted dark:text-white/60 mb-5">
            {t('settings.currency.confirmWarning')}
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => runConversion({ from: current, to: target, rate })}
              className="flex-1"
            >
              {t('settings.currency.confirmAction')}
            </Button>
          </div>
        </div>
      </Modal>
      )}
    </>
  );
}
