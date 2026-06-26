import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  const h2 = 'font-semibold tracking-tight text-2xl text-ink-primary dark:text-white mt-8 mb-4';
  const p = 'text-ink-primary dark:text-white mb-4';
  const list = 'list-disc list-inside text-ink-primary dark:text-white mb-4 ml-4 space-y-1';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-surface-dark-card rounded-container p-8 border border-surface-hairline dark:border-surface-dark-hairline">
        <h1 className="font-semibold tracking-tight text-3xl text-ink-primary dark:text-white mb-2">
          {t('legal.privacy.title')}
        </h1>
        <p className="text-sm text-ink-muted dark:text-white mb-8">
          {t('legal.lastUpdated')}: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="max-w-none">
          <h2 className={h2}>{t('legal.privacy.section1.title')}</h2>
          <p className={p}>{t('legal.privacy.section1.intro')}</p>
          <ul className={list}>
            <li>{t('legal.privacy.section1.item1')}</li>
            <li>{t('legal.privacy.section1.item2')}</li>
            <li>{t('legal.privacy.section1.item3')}</li>
            <li>{t('legal.privacy.section1.item4')}</li>
          </ul>

          <h2 className={h2}>{t('legal.privacy.section2.title')}</h2>
          <p className={p}>{t('legal.privacy.section2.intro')}</p>
          <ul className={list}>
            <li>{t('legal.privacy.section2.item1')}</li>
            <li>{t('legal.privacy.section2.item2')}</li>
            <li>{t('legal.privacy.section2.item3')}</li>
            <li>{t('legal.privacy.section2.item4')}</li>
            <li>{t('legal.privacy.section2.item5')}</li>
          </ul>

          <h2 className={h2}>{t('legal.privacy.section3.title')}</h2>
          <p className={p}>{t('legal.privacy.section3.p1')}</p>
          <p className={p}>{t('legal.privacy.section3.p2')}</p>

          <h2 className={h2}>{t('legal.privacy.section4.title')}</h2>
          <p className={p}>{t('legal.privacy.section4.content')}</p>

          <h2 className={h2}>{t('legal.privacy.section5.title')}</h2>
          <p className={p}>{t('legal.privacy.section5.content')}</p>

          <h2 className={h2}>{t('legal.privacy.section6.title')}</h2>
          <p className={p}>{t('legal.privacy.section6.intro')}</p>
          <ul className={list}>
            <li>{t('legal.privacy.section6.item1')}</li>
            <li>{t('legal.privacy.section6.item2')}</li>
            <li>{t('legal.privacy.section6.item3')}</li>
            <li>{t('legal.privacy.section6.item4')}</li>
          </ul>

          <h2 className={h2}>{t('legal.privacy.section7.title')}</h2>
          <p className={p}>{t('legal.privacy.section7.intro')}</p>
          <ul className={list}>
            <li>{t('legal.privacy.section7.item1')}</li>
            <li>{t('legal.privacy.section7.item2')}</li>
            <li>{t('legal.privacy.section7.item3')}</li>
            <li>{t('legal.privacy.section7.item4')}</li>
            <li>{t('legal.privacy.section7.item5')}</li>
          </ul>

          <h2 className={h2}>{t('legal.privacy.section8.title')}</h2>
          <p className={p}>{t('legal.privacy.section8.content')}</p>

          <h2 className={h2}>{t('legal.privacy.section9.title')}</h2>
          <p className={p}>{t('legal.privacy.section9.content')}</p>

          <h2 className={h2}>{t('legal.privacy.section10.title')}</h2>
          <p className={p}>{t('legal.privacy.section10.content')}</p>

          <h2 className={h2}>{t('legal.privacy.section11.title')}</h2>
          <p className={p}>{t('legal.privacy.section11.content')}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-hairline dark:border-surface-dark-hairline">
          <Link
            to="/"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            ← {t('legal.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
