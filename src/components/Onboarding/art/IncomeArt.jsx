export default function IncomeArt() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Wallet */}
      <rect x="40" y="60" width="120" height="72" rx="8" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <rect x="40" y="60" width="120" height="20" rx="8" fill="var(--c-brand-accent)" opacity="0.15" />
      <circle cx="140" cy="96" r="7" stroke="var(--c-brand-accent)" />
      {/* Incoming coins */}
      <circle cx="70" cy="34" r="12" stroke="var(--c-brand-accent)" />
      <path d="M70 29 v10 M67 32 h6 M67 36 h6" stroke="var(--c-brand-accent)" />
      <circle cx="104" cy="26" r="9" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <path d="M100 46 l6 10 M118 44 l-4 12" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
    </svg>
  );
}
