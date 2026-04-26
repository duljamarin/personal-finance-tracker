import Button from './Button';

/**
 * Warm, branded empty state.
 * Props:
 * - illustration (optional): custom SVG/JSX that replaces the default icon tile.
 * - icon: SVG node rendered inside the brand-tinted circle when no illustration.
 * - title, description: content
 * - action, actionLabel: primary emerald CTA
 * - secondaryAction, secondaryLabel: ghost secondary link-button
 * - limitText: small note shown above the CTA
 */
export default function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  actionLabel,
  secondaryAction,
  secondaryLabel,
  limitText,
  className = '',
}) {
  return (
    <div
      className={`relative bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-[10px] overflow-hidden ${className}`}
    >
      {/* subtle emerald corner accent — branded frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-px -left-px w-20 h-20 border-t border-l border-brand-500/25 rounded-tl-[10px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px -right-px w-20 h-20 border-b border-r border-brand-500/25 rounded-br-[10px]"
      />

      <div className="relative text-center px-6 py-14 sm:py-16">
        {illustration ? (
          <div className="flex justify-center mb-5">{illustration}</div>
        ) : (
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 mb-5">
            {icon}
          </div>
        )}

        <h3 className="text-xl sm:text-2xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-display leading-tight mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-sm sm:text-base text-ink-muted dark:text-ink-dark-muted max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}

        {limitText && (
          <p className="mt-4 text-xs text-ink-muted dark:text-ink-dark-muted">
            {limitText}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            {action && (
              <Button
                onClick={action}
                className="shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30"
              >
                {actionLabel}
              </Button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction}
                className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted hover:text-ink-primary dark:hover:text-ink-dark-primary transition-colors"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
