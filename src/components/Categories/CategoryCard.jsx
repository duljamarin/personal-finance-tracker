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
    <div className="activity-row group flex flex-wrap items-center gap-x-[14px] gap-y-1 p-3 rounded-icon min-w-0">
      <CategoryAvatar category={cat} />
      {/* min width before the amount + actions wrap to a second line (narrow phones) */}
      <div className="flex-1 basis-[140px] min-w-0">
        <p className="min-w-0 [overflow-wrap:anywhere] font-extrabold text-fg">{displayName}</p>
        {meta && <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">{meta}</p>}
      </div>
      {amount && (
        <div className="ml-auto shrink-0 text-right">
          <p className="text-h3 font-extrabold tabular-nums text-fg">{amount}</p>
          {amountLabel && <p className="mt-0.5 text-sm font-semibold text-fg">{amountLabel}</p>}
        </div>
      )}
      <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner"
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:text-danger"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
