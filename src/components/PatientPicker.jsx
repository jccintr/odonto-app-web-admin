import { useEffect, useRef, useState } from 'react';
import { Patients } from '../api/index.js';
import useDebounced from '../hooks/useDebounced.js';
import { maskCpf, maskPhone } from '../lib/masks.js';
import { Input, Spinner } from './ui.jsx';

/** Busca paciente por nome, CPF ou telefone. `value` = { id, name } ou null. */
export default function PatientPicker({ id, value, onChange, invalid }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const query = useDebounced(text.trim(), 250);
  const box = useRef(null);

  useEffect(() => {
    if (!query || value) { setResults([]); return undefined; }
    let alive = true;
    setLoading(true);
    Patients.list({ q: query, active: true, perPage: 8 })
      .then((r) => { if (alive) setResults(r.data); })
      .catch(() => { if (alive) setResults([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query, value]);

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value) {
    return (
      <div className="flex h-10 items-center justify-between rounded-lg border border-border bg-surface-2 px-3">
        <span className="truncate font-medium">{value.name}</span>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => { onChange(null); setText(''); }}>Trocar</button>
      </div>
    );
  }
  return (
    <div ref={box} className="relative">
      <Input id={id} invalid={invalid} placeholder="Digite nome, CPF ou telefone" autoComplete="off" value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && query && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
          {loading && <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted"><Spinner className="size-4" />Buscando…</li>}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nenhum paciente encontrado.</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" role="option" className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface-2" onClick={() => { onChange({ id: p.id, name: p.name }); setOpen(false); }}>
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted">{[p.cpf && maskCpf(p.cpf), p.phone && maskPhone(p.phone)].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
