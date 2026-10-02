import { CategoryIconSvg } from './CategoryIconSvg';
import { getCategoryIcon } from '../../utils/categoryTranslation';
import { CATEGORY_PALETTE } from '../../utils/chartColors';

// Stable per-name color — mirrors the CategoryCard hash-to-color function.
export function colorFromName(name) {
  if (!name) return CATEGORY_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

/**
 * Round category marker: neutral fill + category-colored glyph (de-pastelized).
 * User-created categories have no stock icon, so they show their initial.
 * `fallbackName` names the color/initial when there is no category object.
 */
export default function CategoryAvatar({ category, fallbackName = '', size = 'md' }) {
  const name = category?.name || fallbackName || '?';
  const iconKey = category ? getCategoryIcon(category) : 'Shopping';
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <span
      className={`${dims} rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle`}
      style={{ color: colorFromName(name) }}
      aria-hidden="true"
    >
      {iconKey
        ? <CategoryIconSvg iconKey={iconKey} className="w-4 h-4" />
        : <span className="text-sm font-semibold">{name.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
