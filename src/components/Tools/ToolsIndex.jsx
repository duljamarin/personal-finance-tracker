import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMetaTags } from '../../hooks/useMetaTags';
import { TOOLS, toolPath, localizedPath } from '../../lib/tools';

/**
 * Tools index — public, unauthenticated. Lists every calculator in TOOLS so the
 * page grows automatically as tools are added (same single-source pattern as the
 * navbar and landing section). Sibling of the calculators: same tokens, same
 * head/meta plumbing, self-referencing canonical.
 */

/**
 * Albanian flag — signals these tools are Albania-specific. Decorative: the card
 * title names each tool. Served from /flag-al.svg (renders identically on every
 * OS, unlike the emoji). Same asset the navbar uses.
 */
function FlagAL() {
  return (
    <img
      src="/flag-al.svg"
      alt=""
      aria-hidden="true"
      width="24"
      height="17"
      className="w-6 h-[17px] rounded-[2px] shadow-xs flex-shrink-0"
    />
  );
}

function ArrowRight({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export default function ToolsIndex() {
  const { t, i18n } = useTranslation();

  const metaTitle = `${t('toolsIndex.metaTitle')} | Personal Finances`;
  const metaDescription = t('toolsIndex.metaDescription');
  const selfUrl = `https://personal-finances.app${toolPath('/tools', i18n.language)}`;

  useMetaTags({
    title: metaTitle,
    description: metaDescription,
    canonical: selfUrl,
    hreflangs: [
      { lang: 'en', href: 'https://personal-finances.app/tools' },
      { lang: 'sq', href: 'https://personal-finances.app/sq/tools' },
      { lang: 'x-default', href: 'https://personal-finances.app/tools' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: t('toolsIndex.metaTitle'),
        url: selfUrl,
        description: metaDescription,
        inLanguage: i18n.language?.startsWith('sq') ? 'sq' : 'en',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Personal Finance Tracker',
          url: 'https://personal-finances.app/',
        },
        // The list of tools this page collects — every entry is a real route.
        hasPart: TOOLS.map((tool) => ({
          '@type': 'WebApplication',
          name: t(tool.labelKey),
          url: `https://personal-finances.app${toolPath(tool.path, i18n.language)}`,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Personal Finances', item: 'https://personal-finances.app/' },
          { '@type': 'ListItem', position: 2, name: t('toolsIndex.metaTitle'), item: selfUrl },
        ],
      },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="eyebrow mb-2">{t('toolsIndex.eyebrow')}</p>
        <h1 className="font-display text-title sm:text-display text-ink-primary dark:text-white mb-3">
          {t('toolsIndex.title')}
        </h1>
        <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed max-w-xl">
          {t('toolsIndex.intro')}
        </p>
      </div>

      {/* ── Tool cards (mapped over TOOLS — grows automatically) ────────── */}
      <div className="grid grid-cols-1 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.path}
            to={toolPath(tool.path, i18n.language)}
            className="group flex items-start gap-4 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-6 transition-colors hover:border-brand-400 dark:hover:border-brand-700 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15"
          >
            <FlagAL />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-heading text-ink-primary dark:text-white mb-1">
                {t(tool.labelKey)}
              </h2>
              <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed">
                {t(tool.descKey)}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 text-ink-muted dark:text-white/50 transition-transform group-hover:translate-x-1 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── CTA to the app ─────────────────────────────────────────────── */}
      <div className="mt-12 pt-8 border-t border-surface-hairline dark:border-surface-dark-hairline">
        <p className="text-body text-ink-muted dark:text-white/80 mb-4 max-w-xl">
          {t('toolsIndex.ctaText')}
        </p>
        <Link
          to={localizedPath('/register', i18n.language)}
          className="inline-flex items-center justify-center px-5 py-2.5 text-label font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors"
        >
          {t('toolsIndex.ctaButton')}
        </Link>
      </div>
    </div>
  );
}
