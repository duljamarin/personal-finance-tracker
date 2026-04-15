import { useTranslation } from 'react-i18next';

export default function ProgressBar({ currentStep, totalSteps }) {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200 ${
                  isCompleted
                    ? 'bg-brand-600 text-white'
                    : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/40'
                      : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              {step < totalSteps && (
                <div
                  className={`w-10 sm:w-16 h-1 rounded-full transition-colors duration-200 ${
                    isCompleted ? 'bg-brand-600' : 'bg-gray-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
        {t('onboarding.wizard.stepOf', { current: currentStep, total: totalSteps })}
      </p>
    </div>
  );
}
