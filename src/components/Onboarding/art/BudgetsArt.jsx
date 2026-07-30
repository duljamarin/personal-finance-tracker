// Monthly caps: bars filling toward a dashed ceiling line.
export default function BudgetsArt() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Cap ceiling */}
      <line
        x1="30"
        y1="36"
        x2="170"
        y2="36"
        strokeDasharray="5 5"
        className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40"
      />

      {/* Baseline */}
      <line x1="30" y1="130" x2="170" y2="130" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />

      {/* Category bars — each a track with a filled portion under the cap */}
      <rect x="44" y="36" width="26" height="94" rx="3" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <rect x="44" y="72" width="26" height="58" rx="3" fill="var(--c-brand-accent)" stroke="none" />

      <rect x="87" y="36" width="26" height="94" rx="3" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <rect x="87" y="54" width="26" height="76" rx="3" fill="var(--c-brand-accent)" stroke="none" />

      <rect x="130" y="36" width="26" height="94" rx="3" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <rect x="130" y="96" width="26" height="34" rx="3" fill="var(--c-brand-accent)" stroke="none" />
    </svg>
  );
}
