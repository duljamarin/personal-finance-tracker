import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, BarChart3, Target } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

// Calm empty state for a brand-new account: one message, one action, then the
// three things the app does once there is data (icons, not numbering: V6).
export default function FirstRunGuide({ onAddTransaction, index }) {
  const { t } = useTranslation();
  const steps = [
    { Icon: ArrowLeftRight, titleKey: 'dashboard.firstRun.step1Title', descKey: 'dashboard.firstRun.step1Desc' },
    { Icon: BarChart3, titleKey: 'dashboard.firstRun.step2Title', descKey: 'dashboard.firstRun.step2Desc' },
    { Icon: Target, titleKey: 'dashboard.firstRun.step3Title', descKey: 'dashboard.firstRun.step3Desc' },
  ];

  return (
    <Card index={index} className="flex flex-col gap-tile">
      <div className="max-w-xl">
        <h2 className="text-h1 font-extrabold text-fg mb-2">
          {t('dashboard.firstRun.title')}
        </h2>
        <p className="text-base text-fg mb-6">
          {t('dashboard.firstRun.subtitle')}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button onClick={onAddTransaction} leading="plus" type="button">
            {t('dashboard.firstRun.cta')}
          </Button>
          <p className="text-sm font-semibold text-fg">{t('dashboard.firstRun.hint')}</p>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map(({ Icon, titleKey, descKey }) => (
          <li key={titleKey} className="tile-inner p-gap flex flex-col gap-2">
            <span className="w-12 h-12 rounded-icon bg-tile text-brand-text flex items-center justify-center" aria-hidden="true">
              <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
            </span>
            <p className="font-extrabold text-fg">{t(titleKey)}</p>
            <p className="text-sm font-semibold text-fg">{t(descKey)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
