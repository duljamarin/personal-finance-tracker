import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

export default function PremiumFeatureLock({ children, featureName }) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();

  if (isPremium) return children;

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none opacity-50 select-none">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {t('upgrade.premiumRequired')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {t('upgrade.premiumFeature', { feature: featureName })}
          </p>
          <Link to="/pricing">
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all">
              {t('upgrade.upgradeCta')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
