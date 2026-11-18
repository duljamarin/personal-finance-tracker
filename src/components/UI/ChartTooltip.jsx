import { CHART_TOOLTIP_CLASS } from '../../utils/chartTheme';

/**
 * Bento tooltip for multi-series charts. The series color sits on a swatch
 * only; text stays ink (white in dark mode) so it reads on the tile in both
 * themes. A row with `total: true` is set off by a hairline and weighted 800.
 *
 * rows: [{ key, name, color, value, total? }]
 */
export default function ChartTooltip({ label, rows }) {
  return (
    <div className={`${CHART_TOOLTIP_CLASS} min-w-[220px]`}>
      {label && <p className="font-extrabold mb-1.5">{label}</p>}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-2 ${r.total ? 'border-t border-line pt-1.5 mt-1.5' : ''}`}
          >
            <span className="w-2.5 h-2.5 rounded-swatch shrink-0" style={{ background: r.color }} aria-hidden="true" />
            <span className={r.total ? 'font-extrabold' : 'font-semibold'}>{r.name}</span>
            <span className={`ml-auto pl-4 tabular-nums whitespace-nowrap ${r.total ? 'font-extrabold' : 'font-bold'}`}>
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Rows from a Recharts tooltip payload, values run through `fmt`. */
export function rowsFromPayload(payload, fmt, totalKey) {
  return payload.map((entry) => ({
    key: entry.dataKey ?? entry.name,
    name: entry.name,
    color: entry.color,
    value: fmt(Number(entry.value)),
    total: totalKey != null && (entry.dataKey === totalKey || entry.name === totalKey),
  }));
}
