export default function DemoArt() {
  return (
    <svg viewBox="0 0 220 175" fill="none" className="w-full h-auto" strokeLinecap="round" strokeLinejoin="round">
      {/* ── Left card: demo workspace ── */}
      <rect x="8" y="24" width="88" height="106" rx="8" fill="var(--c-brand-accent)" fillOpacity="0.07" stroke="var(--c-brand-accent)" strokeOpacity="0.3" strokeWidth="1.2" />
      {/* card header bar */}
      <rect x="8" y="24" width="88" height="18" rx="8" fill="var(--c-brand-accent)" fillOpacity="0.18" />
      <rect x="14" y="33" width="36" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.6" />
      {/* mini bar chart inside left card */}
      <rect x="16" y="76" width="10" height="28" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.5" />
      <rect x="30" y="64" width="10" height="40" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.7" />
      <rect x="44" y="70" width="10" height="34" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.4" />
      <rect x="58" y="58" width="10" height="46" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.9" />
      <rect x="72" y="68" width="10" height="36" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.55" />
      {/* label rows */}
      <rect x="16" y="48" width="50" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.25" />
      <rect x="16" y="56" width="36" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.15" />

      {/* ── Arrow: demo → real ── */}
      <line x1="98" y1="77" x2="122" y2="77" stroke="var(--c-brand-accent)" strokeWidth="1.6" strokeDasharray="3 2.5" strokeOpacity="0.7" />
      <path d="M119 72 L125 77 L119 82" stroke="var(--c-brand-accent)" strokeWidth="1.6" strokeOpacity="0.9" fill="none" />

      {/* ── Right card: real workspace ── */}
      <rect x="126" y="14" width="88" height="116" rx="8" fill="white" fillOpacity="0.04" stroke="var(--c-brand-accent)" strokeOpacity="0.55" strokeWidth="1.4" />
      {/* card header */}
      <rect x="126" y="14" width="88" height="18" rx="8" fill="var(--c-brand-accent)" fillOpacity="0.22" />
      <rect x="132" y="23" width="44" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.8" />
      {/* checkmark badge top-right */}
      <circle cx="204" cy="23" r="6" fill="var(--c-brand-accent)" fillOpacity="0.9" />
      <path d="M201 23l2 2 4-4" stroke="white" strokeWidth="1.4" />
      {/* stat rows inside right card */}
      <rect x="134" y="40" width="28" height="14" rx="3" fill="var(--c-brand-accent)" fillOpacity="0.18" />
      <rect x="134" y="47" width="28" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.5" />
      <rect x="168" y="40" width="38" height="14" rx="3" fill="var(--c-brand-accent)" fillOpacity="0.1" />
      <rect x="168" y="47" width="38" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.3" />
      {/* divider */}
      <line x1="134" y1="62" x2="206" y2="62" stroke="var(--c-brand-accent)" strokeOpacity="0.15" strokeWidth="1" />
      {/* transaction rows */}
      <circle cx="139" cy="73" r="4" fill="var(--c-brand-accent)" fillOpacity="0.5" />
      <rect x="148" y="70" width="32" height="3.5" rx="1.5" fill="var(--c-brand-accent)" fillOpacity="0.3" />
      <rect x="148" y="75.5" width="20" height="2.5" rx="1" fill="var(--c-brand-accent)" fillOpacity="0.15" />
      <rect x="192" y="70" width="14" height="6" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.35" />

      <circle cx="139" cy="89" r="4" fill="var(--c-brand-accent)" fillOpacity="0.3" />
      <rect x="148" y="86" width="28" height="3.5" rx="1.5" fill="var(--c-brand-accent)" fillOpacity="0.2" />
      <rect x="148" y="91.5" width="18" height="2.5" rx="1" fill="var(--c-brand-accent)" fillOpacity="0.1" />
      <rect x="192" y="86" width="14" height="6" rx="2" fill="var(--c-expense)" fillOpacity="0.3" />

      <circle cx="139" cy="105" r="4" fill="var(--c-brand-accent)" fillOpacity="0.2" />
      <rect x="148" y="102" width="36" height="3.5" rx="1.5" fill="var(--c-brand-accent)" fillOpacity="0.15" />
      <rect x="148" y="107.5" width="22" height="2.5" rx="1" fill="var(--c-brand-accent)" fillOpacity="0.08" />
      <rect x="192" y="102" width="14" height="6" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.25" />

      {/* ── Bottom caption chips ── */}
      <rect x="8" y="144" width="88" height="18" rx="5" fill="var(--c-brand-accent)" fillOpacity="0.08" stroke="var(--c-brand-accent)" strokeOpacity="0.2" strokeWidth="1" />
      <rect x="14" y="149" width="40" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.35" />
      <rect x="58" y="149" width="24" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.2" />

      <rect x="126" y="144" width="88" height="18" rx="5" fill="var(--c-brand-accent)" fillOpacity="0.13" stroke="var(--c-brand-accent)" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="132" y="149" width="48" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.55" />
      <rect x="184" y="149" width="16" height="4" rx="2" fill="var(--c-brand-accent)" fillOpacity="0.3" />
    </svg>
  );
}
