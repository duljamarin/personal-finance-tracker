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

          const circle = isCompleted
            ? 'bg-brand-600 text-white border-brand-600'
            : isCurrent
              ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/30 ring-4 ring-brand-500/15'
              : 'bg-white dark:bg-surface-dark-card border-surface-hairline dark:border-surface-dark-hairline';

          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold tabular-nums transition-all duration-200 ${circle}`}
                style={(!isCompleted && !isCurrent) ? { color: 'inherit' } : undefined}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  String(step).padStart(2, '0')
                )}
              </div>
              {step < totalSteps && (
                <div className={`w-12 sm:w-20 h-px transition-colors duration-200 ${
                  isCompleted ? 'bg-brand-500' : 'bg-surface-hairline dark:bg-surface-dark-hairline'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2 mt-3">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCurrent = step === currentStep;
          return (
            <div key={`label-${step}`} className="flex items-center gap-2">
              <span
                className="w-10 text-center text-[10px] font-medium"
                style={{ color: isCurrent ? '#22ad93' : 'inherit' }}
              >
                {t(`onboarding.steps.${step}`)}
              </span>
              {step < totalSteps && <div className="w-12 sm:w-20" />}
            </div>
          );
        })}
      </div>
      <p className="text-center mt-4 text-[12px] font-medium" style={{ color: 'inherit' }}>
        {t('onboarding.wizard.stepOf', { current: currentStep, total: totalSteps })}
      </p>
    </div>
  );
}
