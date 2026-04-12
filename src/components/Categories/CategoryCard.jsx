import { memo } from 'react';
import { getCategoryEmoji, translateCategoryName } from '../../utils/categoryTranslation';

export default memo(function CategoryCard({ cat, onEdit, onDelete, editLabel, deleteLabel }) {
  const emoji = getCategoryEmoji(cat);
  const displayName = translateCategoryName(cat.name);

  return (
    <div className="relative group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white dark:bg-surface-dark-tertiary border border-gray-100 dark:border-zinc-800 shadow hover:shadow-lg hover:border-brand-400 dark:hover:border-brand-600 transition-all duration-200 cursor-pointer min-h-[110px]">
      {/* Emoji icon */}
      <span className="text-4xl leading-none select-none">{emoji}</span>

      {/* Category name */}
      <span className="text-sm font-semibold text-center text-gray-700 dark:text-gray-200 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
        {displayName}
      </span>

      {/* Hover overlay with edit / delete */}
      <div className="absolute inset-0 rounded-2xl flex items-end justify-center gap-1 pb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 dark:bg-black/40 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-lg shadow-sm transition"
          title={editLabel}
        >
          ✏️
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm transition"
          title={deleteLabel}
        >
          🗑️
        </button>
      </div>
    </div>
  );
});
