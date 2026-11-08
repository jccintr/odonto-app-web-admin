import { useState } from 'react';
import { Patients } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import Odontogram, { OdontogramLegend } from '../../components/Odontogram.jsx';
import ToothFacesPicker from '../../components/ToothFacesPicker.jsx';
import { Alert, Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, Loading, Select, Table, Textarea } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { CONDITION } from '../../lib/labels.js';
import { toothLabel } from '../../lib/tooth.js';

export default function OdontogramTab({ patient }) {
  const { isAdmin } = useAuth();
  const ui = useUI();
  const data = useResource(() => Patients.odontogram(patient.id), [patient.id]);
  const [selected, setSelected] = useState(null);
  const [deciduous, setDeciduous] = useState(false);
  const [form, setForm] = useState({ condition: 'caries', faces: '', notes: '', recordedOn: dayOf() });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (data.loading && !data.data) return <Loading />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  const { teeth, planned = {} } = data.data;
  const records = selected ? teeth[selected] ?? [] : [];
  const all = Object.values(teeth).flat().sort((a, b) => a.tooth - b.tooth || a.recordedOn.localeCompare(b.recordedOn));
  const hasDeciduous = all.some((r) => r.tooth >= 51);

  const mark = async () => {
    setBusy(true); setError(null);
    try {
      await Patients.mark(patient.id, { tooth: selected, condition: form.condition, faces: form.faces || undefined, notes: form.notes.trim() || undefined, recordedOn: form.recordedOn });
      ui.success(`Dente ${selected} marcado.`);
      setForm({ ...form, faces: '', notes: '' });
      await data.reload();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const unmark = async (record) => {
    if (!(await ui.confirm({ title: 'Remover marcação?', message: `${CONDITION[record.condition]?.label} no dente ${record.tooth}. O histórico guarda quem removeu.`, confirmLabel: 'Remover', danger: true }))) return;
    try { await Patients.unmark(patient.id, record.id); await data.reload(); } catch (err) { ui.error(err); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Odontograma" subtitle={isAdmin ? 'Clique em um dente para ver o histórico e marcar.' : 'Consulta (as marcações são feitas pelo dentista).'}
          action={<Checkbox label="Dentes de leite" checked={deciduous || hasDeciduous} onChange={(e) => setDeciduous(e.target.checked)} />} />
        <div className="p-4"><Odontogram teeth={teeth} planned={planned} selected={selected} onSelect={(t) => setSelected(t === selected ? null : t)} interactive deciduous={deciduous || hasDeciduous} /></div>
        <div className="border-t border-border px-4 py-3"><OdontogramLegend /></div>
      </Card>

      {selected && (
        <Card>
          <CardHeader title={toothLabel(selected)} action={<Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>} />
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <div>
              {(planned[selected] ?? []).length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-muted">Planejado para este dente</h3>
                  <ul className="flex flex-col gap-2">
                    {planned[selected].map((p) => (
                      <li key={p.itemId} className="rounded-lg border border-dashed border-border p-3 text-sm">
                        <span className="font-medium">{p.procedure.name}</span>{p.faces && <span className="text-muted"> ({p.faces})</span>}
                        <span className="block text-muted">{p.approved ? 'Aprovado pelo paciente: a realizar' : 'Proposto no orçamento, ainda sem aprovação'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <h3 className="mb-2 text-sm font-semibold text-muted">Histórico do dente</h3>
              {records.length === 0 ? <p className="text-muted">Nenhuma marcação neste dente.</p> : (
                <ul className="flex flex-col gap-2">
                  {records.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                      <div><p className="flex items-center gap-2 font-medium"><span className="size-3 rounded-sm" style={{ background: CONDITION[r.condition]?.color }} />{CONDITION[r.condition]?.label ?? r.condition}{r.faces && <span className="text-muted">({r.faces})</span>}</p>
                        <p className="text-muted">{formatDay(r.recordedOn)}{r.sourceItemId ? ' · automática (procedimento realizado)' : ''}{r.recordedByName ? ` · ${r.recordedByName}` : ''}</p>{r.notes && <p className="mt-1">{r.notes}</p>}</div>
                      {isAdmin && <Button size="sm" variant="ghost" className="text-danger" onClick={() => unmark(r)}>Remover</Button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted">Nova marcação</h3>
                {error && <Alert tone="danger">{error}</Alert>}
                <Field label="Condição">{({ id }) => <Select id={id} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{Object.entries(CONDITION).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</Select>}</Field>
                <Field label="Faces (opcional)"><div><ToothFacesPicker idPrefix="mark" tooth={selected} faces={form.faces} onChange={({ faces }) => setForm({ ...form, faces })} /></div></Field>
                <Field label="Data">{({ id }) => <Input id={id} type="date" max={dayOf()} value={form.recordedOn} onChange={(e) => setForm({ ...form, recordedOn: e.target.value })} />}</Field>
                <Field label="Observações">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}</Field>
                <Button loading={busy} onClick={mark}>Marcar dente {selected}</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Todas as marcações" />
        {all.length === 0 ? <p className="p-5 text-muted">Nenhuma marcação ainda.</p> : (
          <Table head={['Dente', 'Condição', 'Faces', 'Data', 'Origem', 'Dentista / registrado por']}>
            {all.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setSelected(r.tooth)}>
                <td className="px-4 py-3 font-medium tabular-nums">{r.tooth}</td>
                <td className="px-4 py-3"><span className="mr-2 inline-block size-3 rounded-sm align-middle" style={{ background: CONDITION[r.condition]?.color }} />{CONDITION[r.condition]?.label ?? r.condition}</td>
                <td className="px-4 py-3 text-muted">{r.faces ?? '—'}</td>
                <td className="px-4 py-3">{formatDay(r.recordedOn)}</td>
                <td className="px-4 py-3 text-muted">{r.sourceItemId ? 'Procedimento realizado' : 'Marcação manual'}</td>
                <td className="px-4 py-3">{r.recordedByName ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
