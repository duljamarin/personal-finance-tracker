/**
 * In-app page header row (design-system §3.5): h1, optional context chip
 * (R_PILL, --tile, e.g. "Day 18 of 30"), optional inline extra (children,
 * e.g. a MonthSwitcher), actions on the right.
 */
export default function PageHeader({ title, subtitle, chip, actions, children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-[14px] gap-y-3 px-1 py-1.5 mb-gap ${className}`}>
      <div className="min-w-0 flex flex-wrap items-center gap-x-[14px] gap-y-2">
        <h1 className="text-h1 font-extrabold text-fg">{title}</h1>
        {chip && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-pill bg-tile border border-line text-sm font-bold text-fg tabular-nums whitespace-nowrap">
            {chip}
          </span>
        )}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 ml-auto">{actions}</div>}
      {subtitle && <p className="basis-full text-sm font-semibold text-fg">{subtitle}</p>}
    </div>
  );
}
