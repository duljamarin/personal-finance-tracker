import { ArrowRight, Plus } from 'lucide-react';

/**
 * Pill button (design-system §3.2). Weight 700, R_PILL, ≥44px tall.
 * leading="plus"  renders a "+" that rotates 90deg on hover.
 * trailing="arrow" renders an arrow that nudges 4px right on hover.
 * Any child carrying .plus-spin / .arrow-nudge gets the same behaviour.
 */
const VARIANTS = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white border-2 border-brand-600 hover:border-brand-700',
  success: 'bg-brand-600 hover:bg-brand-700 text-white border-2 border-brand-600 hover:border-brand-700',
  secondary: 'bg-tile text-fg border-2 border-fg hover:bg-fg hover:text-tile',
  danger: 'bg-tile text-danger border-2 border-danger hover:bg-danger hover:text-white',
  ghost: 'bg-transparent text-fg border-2 border-transparent hover:bg-inner',
};

const SIZES = {
  sm: 'min-h-11 px-4 text-sm gap-1.5',
  md: 'min-h-11 px-5 text-sm gap-2',
  lg: 'min-h-[52px] px-7 text-body-lg gap-2.5',
};

const ICON = { sm: 'w-4 h-4', md: 'w-[18px] h-[18px]', lg: 'w-[18px] h-[18px]' };

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  ...props
}) {
  // No default `type`: existing forms rely on the native submit default.
  return (
    <button
      className={`group btn-motion btn-lift inline-flex items-center justify-center rounded-pill font-bold disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {leading === 'plus' && <Plus className={`plus-spin shrink-0 ${ICON[size]}`} strokeWidth={2.6} aria-hidden="true" />}
      {children}
      {trailing === 'arrow' && <ArrowRight className={`arrow-nudge shrink-0 ${ICON[size]}`} strokeWidth={2.4} aria-hidden="true" />}
    </button>
  );
}
