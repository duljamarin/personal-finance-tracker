import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { translateCategoryName } from '../../utils/categoryTranslation';
import CategoryAvatar from '../UI/CategoryAvatar';

/**
 * One category as a list row. `meta` (e.g. "12 transactions") and `amount`
 * (this month's spending, already formatted) and its `amountLabel` are optional.
 */
export default memo(function CategoryCard({ cat, onEdit, onDelete, editLabel, deleteLabel, meta, amount, amountLabel }) {
  const displayName = translateCategoryName(cat.name);

  return (
    <div className="group flex items-center gap-3 px-4 sm:px-5 py-3 bg-white dark:bg-surface-dark-card min-w-0">
      <CategoryAvatar category={cat} />
      <div className="flex-1 min-w-0">
        <p className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-ink-primary dark:text-white">{displayName}</p>
        {meta && <p className="mt-0.5 text-xs text-ink-muted dark:text-white tabular-nums">{meta}</p>}
      </div>
      {amount && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-ink-primary dark:text-white">{amount}</p>
          {amountLabel && <p className="mt-0.5 text-xs text-ink-muted dark:text-white">{amountLabel}</p>}
        </div>
      )}
      <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-ink-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-expense dark:hover:text-expense hover:bg-expense/5 transition-colors"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
});
