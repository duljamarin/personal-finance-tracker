// Two goal cards with progress rails, plus a flag marking the target.
export default function GoalsArt() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Flag / target marker */}
      <line x1="100" y1="18" x2="100" y2="52" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <path d="M100 20 L128 27 L100 34 Z" fill="var(--c-brand-accent)" />

      {/* Goal card one */}
      <rect x="30" y="64" width="140" height="34" rx="4" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <line x1="42" y1="76" x2="96" y2="76" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <rect x="42" y="84" width="116" height="6" rx="3" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <rect x="42" y="84" width="78" height="6" rx="3" fill="var(--c-brand-accent)" stroke="none" />

      {/* Goal card two */}
      <rect x="30" y="108" width="140" height="34" rx="4" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <line x1="42" y1="120" x2="84" y2="120" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <rect x="42" y="128" width="116" height="6" rx="3" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <rect x="42" y="128" width="40" height="6" rx="3" fill="var(--c-brand-accent)" stroke="none" />
    </svg>
  );
}
