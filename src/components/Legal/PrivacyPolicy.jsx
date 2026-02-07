import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('legal.privacy.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {t('legal.lastUpdated')}: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          {/* Section 1 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section1.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section1.intro')}
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>{t('legal.privacy.section1.item1')}</li>
            <li>{t('legal.privacy.section1.item2')}</li>
            <li>{t('legal.privacy.section1.item3')}</li>
            <li>{t('legal.privacy.section1.item4')}</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section2.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section2.intro')}
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>{t('legal.privacy.section2.item1')}</li>
            <li>{t('legal.privacy.section2.item2')}</li>
            <li>{t('legal.privacy.section2.item3')}</li>
            <li>{t('legal.privacy.section2.item4')}</li>
            <li>{t('legal.privacy.section2.item5')}</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section3.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section3.p1')}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section3.p2')}
          </p>

          {/* Section 4 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section4.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section4.content')}
          </p>

          {/* Section 5 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section5.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section5.content')}
          </p>

          {/* Section 6 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section6.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section6.intro')}
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>{t('legal.privacy.section6.item1')}</li>
            <li>{t('legal.privacy.section6.item2')}</li>
            <li>{t('legal.privacy.section6.item3')}</li>
            <li>{t('legal.privacy.section6.item4')}</li>
          </ul>

          {/* Section 7 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section7.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section7.content')}
          </p>

          {/* Section 8 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section8.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section8.intro')}
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>{t('legal.privacy.section8.item1')}</li>
            <li>{t('legal.privacy.section8.item2')}</li>
            <li>{t('legal.privacy.section8.item3')}</li>
            <li>{t('legal.privacy.section8.item4')}</li>
            <li>{t('legal.privacy.section8.item5')}</li>
          </ul>

          {/* Section 9 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section9.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section9.content')}
          </p>

          {/* Section 10 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section10.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section10.content')}
          </p>

          {/* Section 11 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            {t('legal.privacy.section11.title')}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t('legal.privacy.section11.content')}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← {t('legal.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
