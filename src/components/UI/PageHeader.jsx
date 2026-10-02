/**
 * Standard in-app page header: title (+ optional subtitle / inline extra such
 * as a month switcher) on the left, actions on the right. Every authenticated
 * page uses this so titles sit at the same size and position app-wide.
 */
export default function PageHeader({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-title font-display text-ink-primary dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted dark:text-white">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
