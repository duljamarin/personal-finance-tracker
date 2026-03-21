import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200/60 dark:border-zinc-800 py-6 text-xs text-gray-400 dark:text-gray-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          &copy; {year} {t('app.name')}. {t('footer.rights')}
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/terms"
            className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('footer.terms')}
          </Link>
          <Link
            to="/privacy"
            className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('footer.privacy')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
