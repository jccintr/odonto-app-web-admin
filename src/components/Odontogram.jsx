import { CONDITION } from '../lib/labels.js';
import { LOWER_DECIDUOUS, LOWER_PERMANENT, UPPER_DECIDUOUS, UPPER_PERMANENT } from '../lib/tooth.js';

const SIZE = 38;
const WHOLE_TOOTH = new Set(['crown', 'implant', 'missing', 'extracted', 'root_canal', 'prosthesis', 'other', 'fracture']); // condições do dente inteiro

/** Geometria das 5 faces no quadrado SIZE×SIZE: V em cima, L embaixo, O no centro; M/D à esquerda/direita conforme o lado do arco. */
function faceShapes(tooth) {
  const rightSide = [1, 4, 5, 8].includes(Math.floor(tooth / 10)); // lado direito do paciente aparece à esquerda da tela: mesial fica voltada para o centro (direita)
  const s = SIZE; const a = s * 0.28; const b = s * 0.72;
  const mesial = rightSide ? 'right' : 'left';
  return {
    V: `M0 0H${s}L${b} ${a}H${a}Z`,
    L: `M0 ${s}H${s}L${b} ${b}H${a}Z`,
    left: `M0 0L${a} ${a}V${b}L0 ${s}Z`,
    right: `M${s} 0L${b} ${a}V${b}L${s} ${s}Z`,
    O: `M${a} ${a}H${b}V${b}H${a}Z`,
    mesial,
  };
}

/** Dente com 5 faces coloridas pelas marcações. `records`: marcações do dente (a mais recente por último). */
function Tooth({ tooth, records = [], planned = [], selected, onSelect, interactive }) {
  const shapes = faceShapes(tooth);
  const fill = {};
  let whole = null;
  for (const r of records) {
    const color = CONDITION[r.condition]?.color ?? '#64748b';
    if (r.faces) for (const f of r.faces) fill[f] = color;
    else if (WHOLE_TOOTH.has(r.condition) || r.condition === 'sealant') whole = r.condition;
  }
  const faceEntries = [['V', shapes.V], ['L', shapes.L], [shapes.mesial === 'left' ? 'M' : 'D', shapes.left], [shapes.mesial === 'right' ? 'M' : 'D', shapes.right], ['O', shapes.O]];
  const wholeColor = whole ? CONDITION[whole].color : null;
  const done = records.map((r) => `${CONDITION[r.condition]?.label ?? r.condition}${r.faces ? ` (${r.faces})` : ''}`).join(', ');
  const toDo = planned.map((p) => `${p.procedure.name}${p.faces ? ` (${p.faces})` : ''} — ${p.approved ? 'aprovado' : 'proposto'}`).join(', ');
  const label = `Dente ${tooth}${done ? `: ${done}` : ''}${toDo ? `. Planejado: ${toDo}` : ''}`;
  const approvedPlan = planned.some((p) => p.approved);
  const content = (
    <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} width={SIZE + 4} height={SIZE + 4} role="img" aria-label={label}>
      <title>{label}</title>
      {faceEntries.map(([face, d]) => <path key={face} d={d} fill={fill[face] ?? 'var(--surface)'} stroke="var(--muted)" strokeWidth="1" />)}
      {whole && (whole === 'missing' || whole === 'extracted')
        ? <path d={`M2 2L${SIZE - 2} ${SIZE - 2}M${SIZE - 2} 2L2 ${SIZE - 2}`} stroke={wholeColor} strokeWidth="3" strokeLinecap="round" />
        : whole && <rect x="1" y="1" width={SIZE - 2} height={SIZE - 2} rx="6" fill="none" stroke={wholeColor} strokeWidth="3" />}
      {planned.length > 0 && <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} rx="5" fill="none" stroke={approvedPlan ? 'var(--primary)' : 'var(--muted)'} strokeWidth="2" strokeDasharray={approvedPlan ? '5 3' : '2 3'} data-planned={approvedPlan ? 'approved' : 'proposed'} />}
      {selected && <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} rx="4" fill="none" stroke="var(--primary)" strokeWidth="3" />}
    </svg>
  );
  return (
    <div className="flex flex-col items-center gap-0.5">
      {interactive
        ? <button type="button" aria-label={label} aria-pressed={selected} onClick={() => onSelect(tooth)} className="rounded hover:bg-surface-2">{content}</button>
        : content}
      <span className="text-[11px] font-medium text-muted tabular-nums">{tooth}</span>
    </div>
  );
}

function Arch({ upper, lower, records, planned, selected, onSelect, interactive }) {
  const row = (list) => (
    <div className="flex items-center justify-center gap-0.5">
      {list.map((n, i) => (
        <div key={n} className={i === list.length / 2 ? 'ml-3 border-l border-border pl-3' : ''}>
          <Tooth tooth={n} records={records[n]} planned={planned[n]} selected={selected === n} onSelect={onSelect} interactive={interactive} />
        </div>
      ))}
    </div>
  );
  return <div className="flex flex-col gap-3 overflow-x-auto py-2">{row(upper)}<div className="mx-auto h-px w-full max-w-2xl bg-border" />{row(lower)}</div>;
}

/** Odontograma completo. `teeth`: { "16": [marcações] } (resposta da API). */
export default function Odontogram({ teeth = {}, planned = {}, selected, onSelect, interactive = false, deciduous = false }) {
  return (
    <div className="odontogram flex flex-col gap-2">
      <Arch upper={UPPER_PERMANENT} lower={LOWER_PERMANENT} records={teeth} planned={planned} selected={selected} onSelect={onSelect} interactive={interactive} />
      {deciduous && <><p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">Dentes de leite</p><Arch upper={UPPER_DECIDUOUS} lower={LOWER_DECIDUOUS} records={teeth} planned={planned} selected={selected} onSelect={onSelect} interactive={interactive} /></>}
    </div>
  );
}

export function OdontogramLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
      {Object.entries(CONDITION).map(([key, c]) => <li key={key} className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: c.color }} />{c.label}</li>)}
      <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-dashed border-primary" />Planejado (aprovado)</li>
      <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-dotted border-muted" />Planejado (proposto)</li>
    </ul>
  );
}
