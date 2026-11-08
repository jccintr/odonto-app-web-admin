import { ALL_TEETH, FACES, LOWER_DECIDUOUS, LOWER_PERMANENT, UPPER_DECIDUOUS, UPPER_PERMANENT, normalizeFaces } from '../lib/tooth.js';
import { Select, cx } from './ui.jsx';

const GROUPS = [
  ['Superiores', UPPER_PERMANENT], ['Inferiores', LOWER_PERMANENT], ['Superiores (leite)', UPPER_DECIDUOUS], ['Inferiores (leite)', LOWER_DECIDUOUS],
];

/** Dente (FDI) + faces. Sem dente = procedimento geral (ex.: limpeza). `tooth`: número ou null; `faces`: texto como "DO". */
export default function ToothFacesPicker({ tooth, faces, onChange, idPrefix = 'tooth', disabled }) {
  const selected = normalizeFaces(faces);
  const toggle = (face) => {
    const next = selected.includes(face) ? selected.replace(face, '') : selected + face;
    onChange({ tooth, faces: normalizeFaces(next) });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select id={`${idPrefix}-tooth`} aria-label="Dente" className="w-auto min-w-36" disabled={disabled} value={tooth ?? ''}
        onChange={(e) => { const value = e.target.value ? Number(e.target.value) : null; onChange({ tooth: value, faces: value ? faces : '' }); }}>
        <option value="">Sem dente (geral)</option>
        {GROUPS.map(([label, list]) => <optgroup key={label} label={label}>{list.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>)}
      </Select>
      <div className="flex gap-1" role="group" aria-label="Faces do dente">
        {FACES.map((f) => (
          <button key={f.id} type="button" title={f.label} aria-label={f.label} aria-pressed={selected.includes(f.id)} disabled={disabled || !tooth || !ALL_TEETH.includes(tooth)}
            onClick={() => toggle(f.id)}
            className={cx('size-9 rounded-lg border text-sm font-semibold transition disabled:opacity-40', selected.includes(f.id) ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-muted hover:bg-surface-2')}>
            {f.id}
          </button>
        ))}
      </div>
    </div>
  );
}
