import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';
import { progressColor } from '../../utils/chartColors';

/**
 * Compact usage counter bar. Shows used/limit and a progress bar.
 * Only visible on the free plan.
 *
 * Props:
 *   used        - current usage count
 *   limit       - plan limit
 *   labelKey    - i18n key for the resource name (e.g. 'freePlanCounter.transactions')
 *   scopeNote   - optional short suffix clarifying WHAT the limit applies to
 *                 (e.g. "this month" for budgets vs "at a time" for goals).
 *                 Budgets are per year+month rows, goals are not scoped to a
 *                 month at all, so the same "x / 10" reads differently.
 *   threshold   - 0-1 fraction below which the bar is hidden. Defaults to 0 so
 *                 the limit is always visible: a user at 3/10 could not see
 *                 their cap at all under the old 0.5 default, which made the
 *                 free plan feel arbitrary the moment they hit it.
 */
export default function FreePlanUsageCounter({ used, limit, labelKey, scopeNote, threshold = 0 }) {
  const { t } = useTranslation();
  const { isPremium, isTrialing, loading: subLoading } = useSubscription();

  // Reserve layout space while loading to prevent CLS
  if (subLoading) {
    return <div className="h-[52px] rounded-lg bg-surface-hairline dark:bg-surface-dark-hairline animate-pulse" />;
  }

  if (isPremium || isTrialing) return null;
  if (!limit || limit <= 0) return null;

  const pct = Math.min(1, used / limit);
  if (threshold > 0 && pct < threshold) return null;

  const isNearLimit = pct >= 0.8 && pct < 1;
  const isAtLimit   = pct >= 1;

  const barColor = progressColor(pct);

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-control border text-sm ${
      isAtLimit
        ? 'bg-expense-bg border-expense/30'
        : isNearLimit
        ? 'bg-warning-bg border-warning/30'
        : 'bg-surface-page dark:bg-surface-dark-elevated border-surface-hairline dark:border-surface-dark-hairline'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span className="text-xs font-medium text-ink-primary dark:text-white truncate">
            {t(labelKey)}:{' '}
            <span className="tabular-nums font-semibold">{used}</span>
            <span className="tabular-nums"> / {limit}</span>
            {scopeNote && <span className="font-normal"> {scopeNote}</span>}
          </span>
          {(isAtLimit || isNearLimit) && (
            <Link
              to="/pricing"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 whitespace-nowrap flex-shrink-0 transition-colors"
            >
              {t('upgrade.upgradeCta')} →
            </Link>
          )}
        </div>
        <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
    </div>
  );
}
