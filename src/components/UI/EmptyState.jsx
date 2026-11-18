import Button from './Button';

/**
 * Warm, branded empty state.
 * Props:
 * - illustration (optional): custom SVG/JSX that replaces the default icon tile.
 * - icon: SVG node rendered inside a 48px --inner icon square when no illustration.
 * - title, description: content
 * - action, actionLabel: primary pill CTA (actionIcon="plus" for a leading +)
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
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`tile relative overflow-hidden ${className}`}
    >
      <div className="relative text-center px-6 py-14 sm:py-16">
        {illustration ? (
          <div className="flex justify-center mb-5">{illustration}</div>
        ) : (
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-icon bg-inner text-brand-text mb-5">
            {icon}
          </div>
        )}

        <h3 className="text-h3 font-bold text-fg mb-1.5">
          {title}
        </h3>

        {description && (
          <p className="text-base text-fg max-w-sm mx-auto">
            {description}
          </p>
        )}

        {limitText && (
          <p className="mt-4 text-sm font-semibold text-fg">
            {limitText}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            {action && (
              <Button onClick={action} leading={actionIcon}>
                {actionLabel}
              </Button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction}
                className="btn-motion min-h-11 px-4 rounded-pill text-sm font-bold text-fg hover:bg-inner"
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
