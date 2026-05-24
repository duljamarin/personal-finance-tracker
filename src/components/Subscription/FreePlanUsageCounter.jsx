import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

/**
 * Compact usage counter bar. Shows used/limit and a progress bar.
 * Only visible on free plan and when usage is >= threshold% of the limit.
 *
 * Props:
 *   used        - current usage count
 *   limit       - plan limit
 *   labelKey    - i18n key for the resource name (e.g. 'freePlanCounter.transactions')
 *   threshold   - 0-1 fraction at which to start showing (default 0.5)
 */
export default function FreePlanUsageCounter({ used, limit, labelKey, threshold = 0.5 }) {
  const { t } = useTranslation();
  const { isPremium, isTrialing } = useSubscription();

  if (isPremium || isTrialing) return null;
  if (!limit || limit <= 0) return null;

  const pct = Math.min(1, used / limit);
  if (pct < threshold) return null;

  const isNearLimit = pct >= 0.8 && pct < 1;
  const isAtLimit   = pct >= 1;

  const barColor = isAtLimit ? '#e8394d' : isNearLimit ? '#f59e0b' : '#168b78';

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border text-sm ${
      isAtLimit
        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
        : isNearLimit
        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
        : 'bg-surface-page dark:bg-surface-dark-elevated border-surface-hairline dark:border-surface-dark-hairline'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span className="text-xs font-medium text-ink-primary dark:text-white truncate">
            {t(labelKey)}: <span className="tabular-nums">{used}</span> / <span className="tabular-nums">{limit}</span>
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
