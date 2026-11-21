import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { localizedPath } from '../../lib/tools';
import { trackEvent } from '../../lib/analytics';

/**
 * The landing page's one primary action: "Start free" -> /register.
 *
 * Every instance names where it sits (data-cta) from a closed list and
 * reports a GoatCounter event `cta_click:<location>` on click, so we can see
 * which placement converts. Do not add locations without updating the list.
 */
export const CTA_EVENT = 'cta_click';
export const CTA_LOCATIONS = ['hero', 'sticky', 'features', 'tools', 'pricing', 'final'];

const SIZES = {
  lg: 'min-h-[52px] px-7 text-body-lg',
  md: 'min-h-12 px-6 text-body',
};

/**
 * The secondary entry next to a primary CTA: "Sign in" -> /login. Below
 * 640px it is a text link (underline on hover/focus, 44px tall touch
 * target) so the page keeps one button per screen; from 640px it is the
 * outlined pill.
 */
export function SecondaryEntry({ className = '' }) {
  const { t, i18n } = useTranslation();
  return (
    <Link
      to={localizedPath('/login', i18n.language)}
      className={`btn-motion inline-flex items-center justify-center min-h-11 px-3 font-bold text-body-lg text-fg underline-offset-4 decoration-2 hover:underline focus-visible:underline btn-lift sm:min-h-[52px] sm:px-7 sm:rounded-pill sm:border-2 sm:border-fg sm:bg-tile sm:hover:bg-fg sm:hover:text-tile sm:hover:no-underline sm:focus-visible:no-underline ${className}`}
    >
      {t('landing.hero.signIn')}
    </Link>
  );
}

export default function PrimaryCta({ location, size = 'lg', className = '', ref, tabIndex }) {
  const { t, i18n } = useTranslation();
  if (import.meta.env?.DEV && !CTA_LOCATIONS.includes(location)) {
    throw new Error(`PrimaryCta: unknown location "${location}"`);
  }
  return (
    <Link
      ref={ref}
      to={localizedPath('/register', i18n.language)}
      data-cta={location}
      tabIndex={tabIndex}
      onClick={() => trackEvent(`${CTA_EVENT}:${location}`)}
      className={`group btn-motion btn-lift inline-flex items-center justify-center gap-2.5 border-2 border-brand-600 bg-brand-600 hover:bg-brand-700 hover:border-brand-700 text-white font-bold rounded-pill whitespace-nowrap ${SIZES[size]} ${className}`}
    >
      {t('landing.hero.getStarted')}
      <ArrowRight className="arrow-nudge w-[18px] h-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
    </Link>
  );
}
