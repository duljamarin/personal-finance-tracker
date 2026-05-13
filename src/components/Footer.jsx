import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-600 rounded-md shadow-sm shadow-brand-500/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17 L10 11 L14 14 L20 6" />
                <path d="M15 6 L20 6 L20 11" />
              </svg>
            </span>
            <p className="text-sm text-ink-muted dark:text-white">
              &copy; {year} {t('app.name')}. {t('footer.rights')}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/terms"
              className="text-sm text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary transition-colors"
            >
              {t('footer.terms')}
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary transition-colors"
            >
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
