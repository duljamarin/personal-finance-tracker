import { useTranslation } from 'react-i18next';
import UIProgressBar from '../UI/ProgressBar';

/**
 * Onboarding step progress (spec 4.5): the Bento ProgressBar with the current
 * step's label and "Step N of M". Replaces the numbered-circle stepper (V6).
 */
export default function ProgressBar({ currentStep, totalSteps, stepLabels }) {
  const { t } = useTranslation();
  const label = stepLabels ? stepLabels[currentStep - 1] : t(`onboarding.steps.${currentStep}`);
  const ratio = totalSteps > 0 ? currentStep / totalSteps : 0;

  return (
    <div className="mb-gap">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <span className="text-sm font-bold text-brand-text">{label}</span>
        <span className="text-sm font-semibold text-fg tabular-nums">
          {t('onboarding.wizard.stepOf', { current: currentStep, total: totalSteps })}
        </span>
      </div>
      <UIProgressBar
        ratio={ratio}
        height={10}
        color="var(--brand-text)"
        animate={false}
        label={t('onboarding.wizard.stepOf', { current: currentStep, total: totalSteps })}
      />
    </div>
  );
}
