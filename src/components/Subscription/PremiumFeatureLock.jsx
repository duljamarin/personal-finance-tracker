import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

export default function PremiumFeatureLock({ children, featureName }) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();

  if (isPremium) return children;

  return (
    <div className="relative rounded-xl overflow-hidden border border-surface-hairline dark:border-surface-dark-hairline bg-surface-subtle dark:bg-surface-dark-subtle">
      {/* Faded content (no blur) */}
      <div className="opacity-30 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-surface-dark-card/80">
        <div className="text-center px-6 py-5 max-w-xs">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-500/20">
            <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Text */}
          <p className="font-display font-semibold tracking-tight text-sm text-ink-primary dark:text-ink-dark-primary mb-3">
            {featureName}
          </p>

          {/* CTA Button */}
          <Link to="/pricing">
            <button className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {t('upgrade.upgradeCta')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
