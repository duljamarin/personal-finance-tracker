import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

export default function PremiumFeatureLock({ children, featureName }) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();

  if (isPremium) return children;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred content */}
      <div className="blur-[2px] pointer-events-none opacity-40 select-none">
        {children}
      </div>

      {/* Elegant minimal overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/60 via-white/50 to-gray-50/60 dark:from-gray-800/60 dark:via-gray-900/50 dark:to-gray-900/60 backdrop-blur-sm">
        <div className="text-center px-6 py-5 max-w-xs">
          {/* Subtle lock icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          {/* Text */}
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {featureName}
          </p>
          
          {/* CTA Button */}
          <Link to="/pricing">
            <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-sm hover:shadow-md">
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
