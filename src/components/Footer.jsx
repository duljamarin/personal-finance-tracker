import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-center sm:text-left">
          &copy; {year} {t('app.name')}. {t('footer.rights')}
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/terms"
            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {t('footer.terms')}
          </Link>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <Link
            to="/privacy"
            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {t('footer.privacy')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
