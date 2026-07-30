import { useTranslation } from 'react-i18next';

export default function ProgressBar({ currentStep, totalSteps, stepLabels }) {
  const { t } = useTranslation();

  // Connector width has to shrink as the wizard grows, or the rail overflows a
  // narrow viewport. At 5 steps the old fixed w-12 (48px) put the row at ~456px,
  // well past a 360px screen minus page padding.
  const connector = totalSteps > 4 ? 'w-4 sm:w-12' : totalSteps === 4 ? 'w-8 sm:w-16' : 'w-12 sm:w-20';
  // Circles must shrink too: 5 x 40px alone leaves almost nothing for gaps.
  const circleSize = totalSteps > 4 ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10';
  const labelWidth = totalSteps > 4 ? 'w-8 sm:w-10' : 'w-10';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
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
            <div key={step} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`${circleSize} rounded-full border flex items-center justify-center text-xs sm:text-sm font-semibold tabular-nums transition-all duration-200 ${circle}`}
                style={(!isCompleted && !isCurrent) ? { color: 'inherit' } : undefined}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  String(step).padStart(2, '0')
                )}
              </div>
              {step < totalSteps && (
                <div className={`${connector} h-px transition-colors duration-200 ${
                  isCompleted ? 'bg-brand-500' : 'bg-surface-hairline dark:bg-surface-dark-hairline'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {/* Mirrors the circle row's widths and gaps exactly so labels stay centered
          under their step. Any change above must be made here too. */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCurrent = step === currentStep;
          return (
            <div key={`label-${step}`} className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={`${labelWidth} text-center text-[10px] font-medium leading-tight`}
                style={{ color: isCurrent ? 'var(--c-brand-accent)' : 'inherit' }}
              >
                {stepLabels ? stepLabels[i] : t(`onboarding.steps.${step}`)}
              </span>
              {step < totalSteps && <div className={connector} />}
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
