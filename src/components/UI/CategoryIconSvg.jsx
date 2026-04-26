import { CATEGORY_ICONS } from '../../utils/categoryTranslation';

export function CategoryIconSvg({ iconKey, className = 'w-5 h-5' }) {
  const path = CATEGORY_ICONS[iconKey];
  if (!path) return null;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}