import { formatMoney } from '../lib/money.js';

const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const shortMoney = (cents) => `R$ ${COMPACT.format(cents / 100)}`;

/** Barras agrupadas (SVG, sem biblioteca). `data`: [{ label, values: [n1, n2] }]; `series`: [{ name, color }]. Valores em centavos. */
export default function BarChart({ data, series, height = 220 }) {
  const width = 640; const pad = { top: 12, right: 8, bottom: 28, left: 52 };
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const plotW = width - pad.left - pad.right; const plotH = height - pad.top - pad.bottom;
  const group = plotW / Math.max(data.length, 1);
  const barW = Math.min(28, (group - 12) / series.length);
  const y = (v) => pad.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const summary = data.map((d) => `${d.label}: ${series.map((s, i) => `${s.name} ${formatMoney(d.values[i])}`).join(', ')}`).join('; ');

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Gráfico de barras. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}><line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="3 3" /><text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{shortMoney(t)}</text></g>
        ))}
        {data.map((d, i) => {
          const x0 = pad.left + i * group + (group - barW * series.length) / 2;
          return (
            <g key={d.label}>
              {series.map((s, k) => (
                <rect key={s.name} x={x0 + k * barW} y={y(d.values[k])} width={barW - 2} height={Math.max(plotH - (y(d.values[k]) - pad.top), 0)} rx="3" fill={s.color}><title>{`${d.label} — ${s.name}: ${formatMoney(d.values[k])}`}</title></rect>
              ))}
              <text x={pad.left + i * group + group / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">{series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  );
}
