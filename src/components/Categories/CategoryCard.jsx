import { memo } from 'react';
import { translateCategoryName } from '../../utils/categoryTranslation';

const PALETTE = [
  '#22ad93', '#168b78', '#C9A87C', '#6A8FC4', '#C46A75',
  '#D0A96A', '#8A8A85', '#43c5aa', '#7A756A', '#9B7EB3',
];

function colorFromName(name) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default memo(function CategoryCard({ cat, onEdit, onDelete, editLabel, deleteLabel }) {
  const displayName = translateCategoryName(cat.name);
  const color = colorFromName(cat.name || 'x');
  const initial = (displayName || '?')[0].toUpperCase();

  return (
    <div className="relative group flex flex-col items-center justify-center gap-3 p-5 rounded-[10px] bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 transition-colors cursor-pointer min-h-[120px]">
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold select-none"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>

      <span className="text-sm font-medium text-center text-ink-primary dark:text-white leading-tight line-clamp-2">
        {displayName}
      </span>

      <div className="absolute inset-0 rounded-[10px] flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-primary/50 dark:bg-black/60 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-700 dark:hover:text-brand-300 shadow-sm transition-colors"
          title={editLabel}
          aria-label={editLabel}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.932Z" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-white dark:bg-surface-dark-card text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-colors"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
});
