import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

export default function PremiumFeatureLock({ children, featureName }) {
  const { t } = useTranslation();
  const { isPremium, isTrialing } = useSubscription();

  if (isPremium || isTrialing) return children;

  return (
    <div className="relative rounded-tile overflow-hidden border border-line bg-inner">
      {/* Faded content (no blur) */}
      <div className="opacity-30 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--tile) 80%, transparent)" }}>
        <div className="text-center px-6 py-5 max-w-xs">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-icon bg-brand-600">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Text */}
          <p className="font-extrabold text-base text-fg mb-3">
            {featureName}
          </p>

          {/* CTA Button */}
          <Link to="/pricing">
            <button className="group btn-motion btn-lift inline-flex items-center gap-2 min-h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 rounded-pill">
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
