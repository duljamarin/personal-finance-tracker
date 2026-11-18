import { CategoryIconSvg } from './CategoryIconSvg';
import { getCategoryIcon } from '../../utils/categoryTranslation';
import { CATEGORY_PALETTE } from '../../utils/chartColors';
import { tintOf } from '../../utils/bento';

// Stable per-name color — mirrors the CategoryCard hash-to-color function.
export function colorFromName(name) {
  if (!name) return CATEGORY_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

/**
 * Category marker (design-system §3.8): icon square (R_ICON) with
 * --tint(categoryColor) background and the icon in the category color.
 * User-created categories without a stock icon show their initial.
 * `fallbackName` names the color/initial when there is no category object.
 * size: lg = 48px (rows, default in Bento lists), md = 40px, sm = 32px.
 */
const DIMS = { lg: 'w-12 h-12', md: 'w-10 h-10', sm: 'w-8 h-8' };
const ICON = { lg: 'w-[22px] h-[22px]', md: 'w-5 h-5', sm: 'w-4 h-4' };

export default function CategoryAvatar({ category, fallbackName = '', size = 'md', className = '' }) {
  const name = category?.name || fallbackName || '?';
  const iconKey = category ? getCategoryIcon(category) : 'Shopping';
  const color = colorFromName(name);
  return (
    <span
      className={`${DIMS[size] || DIMS.md} ${size === 'sm' ? 'rounded-input' : 'rounded-icon'} flex items-center justify-center shrink-0 ${className}`}
      style={{ color, backgroundColor: tintOf(color) }}
      aria-hidden="true"
    >
      {iconKey
        ? <CategoryIconSvg iconKey={iconKey} className={ICON[size] || ICON.md} />
        : <span className="text-base font-extrabold">{name.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
