// Flag icons for the eight supported currencies.
//
// Generated from the `flag-icons` package (MIT, v7.5.0) by scripts/gen_flags.py
// — the real flags, not hand-drawn approximations. Re-run that script if the
// supported-currency list changes; do not hand-edit the FLAGS table.
//
// Inlined rather than loaded from a CDN on purpose:
//   * the sidebar renders on every page, so eight requests plus DNS+TLS to a
//     new host would work against the Mobile >=90 target in CLAUDE.md;
//   * a third-party outage would blank the flags.
// The whole set is ~8KB of markup, which gzips well and ships in the bundle.
//
// SVG ids are namespaced per flag (fi-<iso>-<id>): all eight can share a
// document, and duplicate ids would make clip paths and markers resolve to the
// wrong element.

const FLAGS = {
  ALL: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<path fill="red" d="M0 0h640v480H0z"/>
  <path id="fi-al-al-a" fill="#000001" d="M272 93.3c-4.6 0-12.3 1.5-12.2 5-13-2.1-14.3 3.2-13.5 8q2-2.9 3.9-3.1 2.5-.3 5.4 1.4a22 22 0 0 1 4.8 4.1c-4.6 1.1-8.2.4-11.8-.2a17 17 0 0 1-5.7-2.4c-1.5-1-2-2-4.3-4.3-2.7-2.8-5.6-2-4.7 2.3 2.1 4 5.6 5.8 10 6.6 2.1.3 5.3 1 8.9 1s7.6-.5 9.8 0c-1.3.8-2.8 2.3-5.8 2.8s-7.5-1.8-10.3-2.4c.3 2.3 3.3 4.5 9.1 5.7 9.6 2 17.5 3.6 22.8 6.5a37 37 0 0 1 10.9 9.2c4.7 5.5 5 9.8 5.2 10.8 1 8.8-2.1 13.8-7.9 15.4-2.8.7-8-.7-9.8-2.9-2-2.2-3.7-6-3.2-12 .5-2.2 3.1-8.3.9-9.5a274 274 0 0 0-32.3-15.1c-2.5-1-4.5 2.4-5.3 3.8a50 50 0 0 1-36-23.7c-4.2-7.6-11.3 0-10.1 7.3 1.9 8 8 13.8 15.4 18s17 8.2 26.5 8c5.2 1 5.1 7.6-1 8.9-12.1 0-21.8-.2-30.9-9-6.9-6.3-10.7 1.2-8.8 5.4 3.4 13.1 22.1 16.8 41 12.6 7.4-1.2 3 6.6 1 6.7-8 5.7-22.1 11.2-34.6 0-5.7-4.4-9.6-.8-7.4 5.5 5.5 16.5 26.7 13 41.2 5 3.7-2.1 7.1 2.7 2.6 6.4-18.1 12.6-27.1 12.8-35.3 8-10.2-4.1-11 7.2-5 11 6.7 4 23.8 1 36.4-7 5.4-4 5.6 2.3 2.2 4.8-14.9 12.9-20.8 16.3-36.3 14.2-7.7-.6-7.6 8.9-1.6 12.6 8.3 5.1 24.5-3.3 37-13.8 5.3-2.8 6.2 1.8 3.6 7.3a54 54 0 0 1-21.8 18c-7 2.7-13.6 2.3-18.3.7-5.8-2-6.5 4-3.3 9.4 1.9 3.3 9.8 4.3 18.4 1.3s17.8-10.2 24.1-18.5c5.5-4.9 4.9 1.6 2.3 6.2-12.6 20-24.2 27.4-39.5 26.2-6.7-1.2-8.3 4-4 9 7.6 6.2 17 6 25.4-.2 7.3-7 21.4-22.4 28.8-30.6 5.2-4.1 6.9 0 5.3 8.4-1.4 4.8-4.8 10-14.3 13.6-6.5 3.7-1.6 8.8 3.2 9 2.7 0 8.1-3.2 12.3-7.8 5.4-6.2 5.8-10.3 8.8-19.9 2.8-4.6 7.9-2.4 7.9 2.4-2.5 9.6-4.5 11.3-9.5 15.2-4.7 4.5 3.3 6 6 4.1 7.8-5.2 10.6-12 13.2-18.2 2-4.4 7.4-2.3 4.8 5-6 17.4-16 24.2-33.3 27.8-1.7.3-2.8 1.3-2.2 3.3l7 7c-10.7 3.2-19.4 5-30.2 8l-14.8-9.8c-1.3-3.2-2-8.2-9.8-4.7-5.2-2.4-7.7-1.5-10.6 1 4.2 0 6 1.2 7.7 3.1 2.2 5.7 7.2 6.3 12.3 4.7 3.3 2.7 5 4.9 8.4 7.7l-16.7-.5c-6-6.3-10.6-6-14.8-1-3.3.5-4.6.5-6.8 4.4 3.4-1.4 5.6-1.8 7.1-.3 6.3 3.7 10.4 2.9 13.5 0l17.5 1.1c-2.2 2-5.2 3-7.5 4.8-9-2.6-13.8 1-15.4 8.3a17 17 0 0 0-1.2 9.3q1.1-4.6 4.9-7c8 2 11-1.3 11.5-6.1 4-3.2 9.8-3.9 13.7-7.1 4.6 1.4 6.8 2.3 11.4 3.8q2.4 7.5 11.3 5.6c7 .2 5.8 3.2 6.4 5.5 2-3.3 1.9-6.6-2.5-9.6-1.6-4.3-5.2-6.3-9.8-3.8-4.4-1.2-5.5-3-9.9-4.3 11-3.5 18.8-4.3 29.8-7.8l7.7 6.8q2.3 1.5 3.8 0c6.9-10 10-18.7 16.3-25.3 2.5-2.8 5.6-6.4 9-7.3 1.7-.5 3.8-.2 5.2 1.3 1.3 1.4 2.4 4.1 2 8.2-.7 5.7-2.1 7.6-3.7 11s-3.6 5.6-5.7 8.3c-4 5.3-9.4 8.4-12.6 10.5-6.4 4.1-9 2.3-14 2-6.4.7-8 3.8-2.8 8.1 4.8 2.6 9.2 2.9 12.8 2.2 3-.6 6.6-4.5 9.2-6.6 2.8-3.3 7.6.6 4.3 4.5-5.9 7-11.7 11.6-19 11.5-7.7 1-6.2 5.3-1.2 7.4 9.2 3.7 17.4-3.3 21.6-8 3.2-3.5 5.5-3.6 5 1.9-3.3 9.9-7.6 13.7-14.8 14.2-5.8-.6-5.9 4-1.6 7 9.6 6.6 16.6-4.8 19.9-11.6 2.3-6.2 5.9-3.3 6.3 1.8 0 6.9-3 12.4-11.3 19.4 6.3 10.1 13.7 20.4 20 30.5l19.2-214L320 139c-2-1.8-8.8-9.8-10.5-11-.7-.6-1-1-.1-1.4s3-.8 4.5-1c-4-4.1-7.6-5.4-15.3-7.6 1.9-.8 3.7-.4 9.3-.6a30 30 0 0 0-13.5-10.2c4.2-3 5-3.2 9.2-6.7a86 86 0 0 1-19.5-3.8 37 37 0 0 0-12-3.4zm.8 8.4c3.8 0 6.1 1.3 6.1 2.9s-2.3 2.9-6.1 2.9-6.2-1.5-6.2-3c0-1.6 2.4-2.8 6.2-2.8"/>
  <use xlinkHref="#fi-al-al-a" width="100%" height="100%" transform="matrix(-1 0 0 1 640 0)"/>
      </>
    ),
  },
  EUR: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<defs>
    <g id="fi-eu-eu-d">
      <g id="fi-eu-eu-b">
        <path id="fi-eu-eu-a" d="m0-1-.3 1 .5.1z"/>
        <use xlinkHref="#fi-eu-eu-a" transform="scale(-1 1)"/>
      </g>
      <g id="fi-eu-eu-c">
        <use xlinkHref="#fi-eu-eu-b" transform="rotate(72)"/>
        <use xlinkHref="#fi-eu-eu-b" transform="rotate(144)"/>
      </g>
      <use xlinkHref="#fi-eu-eu-c" transform="scale(-1 1)"/>
    </g>
  </defs>
  <path fill="#039" d="M0 0h640v480H0z"/>
  <g fill="#fc0" transform="translate(320 242.3)scale(23.7037)">
    <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" y="-6"/>
    <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" y="6"/>
    <g id="fi-eu-eu-e">
      <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" x="-6"/>
      <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" transform="rotate(-144 -2.3 -2.1)"/>
      <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" transform="rotate(144 -2.1 -2.3)"/>
      <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" transform="rotate(72 -4.7 -2)"/>
      <use xlinkHref="#fi-eu-eu-d" width="100%" height="100%" transform="rotate(72 -5 .5)"/>
    </g>
    <use xlinkHref="#fi-eu-eu-e" width="100%" height="100%" transform="scale(-1 1)"/>
  </g>
      </>
    ),
  },
  USD: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<path fill="#bd3d44" d="M0 0h640v480H0"/>
  <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/>
  <path fill="#192f5d" d="M0 0h364.8v258.5H0"/>
  <marker id="fi-us-us-a" markerHeight="30" markerWidth="30">
    <path fill="#fff" d="m14 0 9 27L0 10h28L5 27z"/>
  </marker>
  <path fill="none" marker-m d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"/>
      </>
    ),
  },
  GBP: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<path fill="#012169" d="M0 0h640v480H0z"/>
  <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/>
  <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/>
  <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z"/>
  <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z"/>
      </>
    ),
  },
  CHF: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<g fillRule="evenodd" strokeWidth="1pt">
    <path fill="red" d="M0 0h640v480H0z"/>
    <g fill="#fff">
      <path d="M170 195h300v90H170z"/>
      <path d="M275 90h90v300h-90z"/>
    </g>
  </g>
      </>
    ),
  },
  JPY: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<defs>
    <clipPath id="fi-jp-jp-a">
      <path fillOpacity=".7" d="M-88 32h640v480H-88z"/>
    </clipPath>
  </defs>
  <g fillRule="evenodd" strokeWidth="1pt" clipPath="url(#fi-jp-jp-a)" transform="translate(88 -32)">
    <path fill="#fff" d="M-128 32h720v480h-720z"/>
    <circle cx="523.1" cy="344.1" r="194.9" fill="#bc002d" transform="translate(-168.4 8.6)scale(.76554)"/>
  </g>
      </>
    ),
  },
  CAD: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<path fill="#fff" d="M150.1 0h339.7v480H150z"/>
  <path fill="#d52b1e" d="M-19.7 0h169.8v480H-19.7zm509.5 0h169.8v480H489.9zM201 232l-13.3 4.4 61.4 54c4.7 13.7-1.6 17.8-5.6 25l66.6-8.4-1.6 67 13.9-.3-3.1-66.6 66.7 8c-4.1-8.7-7.8-13.3-4-27.2l61.3-51-10.7-4c-8.8-6.8 3.8-32.6 5.6-48.9 0 0-35.7 12.3-38 5.8l-9.2-17.5-32.6 35.8c-3.5.9-5-.5-5.9-3.5l15-74.8-23.8 13.4q-3.2 1.3-5.2-2.2l-23-46-23.6 47.8q-2.8 2.5-5 .7L264 130.8l13.7 74.1c-1.1 3-3.7 3.8-6.7 2.2l-31.2-35.3c-4 6.5-6.8 17.1-12.2 19.5s-23.5-4.5-35.6-7c4.2 14.8 17 39.6 9 47.7"/>
      </>
    ),
  },
  AUD: {
    viewBox: '0 0 640 480',
    paths: (
      <>
<path fill="#00008B" d="M0 0h640v480H0z"/>
  <path fill="#fff" d="m37.5 0 122 90.5L281 0h39v31l-120 89.5 120 89V240h-40l-120-89.5L40.5 240H0v-30l119.5-89L0 32V0z"/>
  <path fill="red" d="M212 140.5 320 220v20l-135.5-99.5zm-92 10 3 17.5-96 72H0zM320 0v1.5l-124.5 94 1-22L295 0zM0 0l119.5 88h-30L0 21z"/>
  <path fill="#fff" d="M120.5 0v240h80V0zM0 80v80h320V80z"/>
  <path fill="red" d="M0 96.5v48h320v-48zM136.5 0v240h48V0z"/>
  <path fill="#fff" d="m527 396.7-20.5 2.6 2.2 20.5-14.8-14.4-14.7 14.5 2-20.5-20.5-2.4 17.3-11.2-10.9-17.5 19.6 6.5 6.9-19.5 7.1 19.4 19.5-6.7-10.7 17.6zm-3.7-117.2 2.7-13-9.8-9 13.2-1.5 5.5-12.1 5.5 12.1 13.2 1.5-9.8 9 2.7 13-11.6-6.6zm-104.1-60-20.3 2.2 1.8 20.3-14.4-14.5-14.8 14.1 2.4-20.3-20.2-2.7 17.3-10.8-10.5-17.5 19.3 6.8L387 178l6.7 19.3 19.4-6.3-10.9 17.3 17.1 11.2ZM623 186.7l-20.9 2.7 2.3 20.9-15.1-14.7-15 14.8 2.1-21-20.9-2.4 17.7-11.5-11.1-17.9 20 6.7 7-19.8 7.2 19.8 19.9-6.9-11 18zm-96.1-83.5-20.7 2.3 1.9 20.8-14.7-14.8-15.1 14.4 2.4-20.7-20.7-2.8 17.7-11L467 73.5l19.7 6.9 7.3-19.5 6.8 19.7 19.8-6.5-11.1 17.6zM234 385.7l-45.8 5.4 4.6 45.9-32.8-32.4-33 32.2 4.9-45.9-45.8-5.8 38.9-24.8-24-39.4 43.6 15 15.8-43.4 15.5 43.5 43.7-14.7-24.3 39.2 38.8 25.1Z"/>
      </>
    ),
  },
};

/**
 * Renders the flag for a currency code, or nothing for an unknown code so a
 * legacy/new currency degrades to its text label instead of a broken glyph.
 *
 * The source art is 4:3; `slice` crops it into the 3:2 chip rather than
 * squashing it.
 */
export default function CurrencyFlag({ code, className = '' }) {
  const flag = FLAGS[code];
  if (!flag) return null;

  return (
    <svg
      viewBox={flag.viewBox}
      className={`w-4 h-[11px] shrink-0 rounded-[2px] ${className}`}
      role="img"
      aria-label={code}
      preserveAspectRatio="xMidYMid slice"
    >
      <title>{code}</title>
      {flag.paths}
      {/* Hairline stops white/light flags dissolving into a light surface. */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="12"
      />
    </svg>
  );
}
