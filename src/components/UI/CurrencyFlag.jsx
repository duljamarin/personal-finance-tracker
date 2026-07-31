// Flag icons for the eight supported currencies.
//
// Inline SVG rather than emoji flags: Windows ships no regional-indicator
// glyphs, so emoji flags degrade to bare letters ("AL") there. Inline also means
// no extra network request and nothing for the artifact CSP to block.
//
// Drawn simplified on purpose — these render at 16px in the sidebar, where
// heraldic detail turns to mud. Each one keeps only what makes the flag
// recognisable at that size.

const VIEW = '0 0 24 16';

// A rounded clip so every flag shares the same silhouette.
function Frame({ children, title }) {
  return (
    <svg
      viewBox={VIEW}
      className="w-4 h-[11px] shrink-0 rounded-[2px]"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid slice"
    >
      <title>{title}</title>
      {children}
      {/* Hairline keeps white/light flags from bleeding into a light surface. */}
      <rect x="0" y="0" width="24" height="16" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
    </svg>
  );
}

const FLAGS = {
  // Albania: red field, black double-headed eagle reduced to its mass.
  ALL: (
    <>
      <rect width="24" height="16" fill="#DA291C" />
      <path
        d="M12 4.2 L13.6 5.6 L15.4 5 L14.6 6.6 L16.2 7.4 L14.4 8 L15 9.6 L13.2 9.2 L12 10.6 L10.8 9.2 L9 9.6 L9.6 8 L7.8 7.4 L9.4 6.6 L8.6 5 L10.4 5.6 Z"
        fill="#000"
      />
    </>
  ),
  // EU: blue field with a ring of stars, simplified to dots.
  EUR: (
    <>
      <rect width="24" height="16" fill="#003399" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={12 + Math.cos(a) * 4.4}
            cy={8 + Math.sin(a) * 4.4}
            r="0.9"
            fill="#FFCC00"
          />
        );
      })}
    </>
  ),
  // USA: stripes + canton.
  USD: (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 2.29} width="24" height="1.14" fill="#B22234" />
      ))}
      {[1, 3, 5].map((i) => (
        <rect key={`b${i}`} y={i * 2.29 + 1.14} width="24" height="1.15" fill="#B22234" />
      ))}
      <rect width="10" height="8.6" fill="#3C3B6E" />
    </>
  ),
  // UK: union flag, diagonals + cross.
  GBP: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.8" />
      <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="3" />
    </>
  ),
  // Switzerland: square-ish white cross on red.
  CHF: (
    <>
      <rect width="24" height="16" fill="#DA291C" />
      <rect x="10.6" y="3.4" width="2.8" height="9.2" fill="#fff" />
      <rect x="7.4" y="6.6" width="9.2" height="2.8" fill="#fff" />
    </>
  ),
  // Japan: red disc on white.
  JPY: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.4" fill="#BC002D" />
    </>
  ),
  // Canada: red bars + maple leaf simplified to a compact mass.
  CAD: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="6" height="16" fill="#D80621" />
      <rect x="18" width="6" height="16" fill="#D80621" />
      <path
        d="M12 3.6 L12.9 6.2 L15 5.4 L14.1 7.6 L16 8.2 L13.6 9.4 L14 11.2 L12 10.4 L10 11.2 L10.4 9.4 L8 8.2 L9.9 7.6 L9 5.4 L11.1 6.2 Z"
        fill="#D80621"
      />
    </>
  ),
  // Australia: union canton + southern cross, reduced to the brightest stars.
  AUD: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L12 8 M12 0 L0 8" stroke="#fff" strokeWidth="1.8" />
      <path d="M6 0 V8 M0 4 H12" stroke="#fff" strokeWidth="2.6" />
      <path d="M6 0 V8 M0 4 H12" stroke="#C8102E" strokeWidth="1.4" />
      <circle cx="6" cy="12" r="1.3" fill="#fff" />
      <circle cx="17" cy="4" r="0.9" fill="#fff" />
      <circle cx="20" cy="8" r="0.9" fill="#fff" />
      <circle cx="17" cy="12" r="0.9" fill="#fff" />
      <circle cx="14.5" cy="8" r="0.7" fill="#fff" />
    </>
  ),
};

/**
 * Renders the flag for a currency code. Returns null for anything unknown so a
 * new/legacy code degrades to just the text label rather than a broken glyph.
 */
export default function CurrencyFlag({ code }) {
  const flag = FLAGS[code];
  if (!flag) return null;
  return <Frame title={code}>{flag}</Frame>;
}
