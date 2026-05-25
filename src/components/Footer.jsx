import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function BrandMark() {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 bg-brand-600 rounded-md shadow-sm shadow-brand-500/20 flex-shrink-0">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 17 L10 11 L14 14 L20 6" />
        <path d="M15 6 L20 6 L20 11" />
      </svg>
    </span>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">

        {/* Top row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group" aria-label={t('app.name')}>
              <BrandMark />
              <span className="font-display text-sm font-bold text-ink-primary dark:text-white tracking-tight">
                {t('app.name')}
              </span>
            </Link>
            <p className="text-xs text-ink-muted dark:text-white/50 leading-relaxed max-w-[200px]">
              {t('footer.builtBy')}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-white/40 mb-4">
              {t('footer.product')}
            </p>
            <ul className="space-y-3">
              <li>
                <Link to="/pricing" className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  {t('footer.pricing')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  {t('footer.register')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  {t('footer.login')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-white/40 mb-4">
              {t('footer.legal')}
            </p>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-white/40 mb-4">
              {t('footer.contact')}
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${t('footer.contactEmail')}`}
                  className="text-sm text-ink-primary dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors break-all"
                >
                  {t('footer.contactEmail')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-surface-hairline dark:border-surface-dark-hairline">
          <p className="text-xs text-ink-muted dark:text-white/40 order-2 sm:order-1">
            &copy; {year} {t('app.name')}. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <span className="text-xs text-ink-muted dark:text-white/35">personal-finances.app</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
