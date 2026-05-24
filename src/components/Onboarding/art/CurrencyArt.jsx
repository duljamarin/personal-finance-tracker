export default function CurrencyArt() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="100" cy="80" r="32" stroke="#22ad93" strokeWidth="2" />
      <text x="100" y="92" textAnchor="middle" className="fill-brand-600 dark:fill-brand-400" style={{ fontFamily: 'DM Sans, Inter Tight, system-ui, sans-serif', fontSize: '28px', fontWeight: 600 }}>€</text>
      <text x="40" y="40" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'DM Sans, Inter Tight, system-ui, sans-serif', fontSize: '14px', fontWeight: 500 }}>$</text>
      <text x="160" y="48" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'DM Sans, Inter Tight, system-ui, sans-serif', fontSize: '14px', fontWeight: 500 }}>£</text>
      <text x="40" y="130" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'DM Sans, Inter Tight, system-ui, sans-serif', fontSize: '14px', fontWeight: 500 }}>¥</text>
      <text x="160" y="124" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'DM Sans, Inter Tight, system-ui, sans-serif', fontSize: '14px', fontWeight: 500 }}>₣</text>
    </svg>
  );
}
