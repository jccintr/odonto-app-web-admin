import { useEffect, useState } from 'react';
import { Patients } from '../../api/index.js';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Textarea } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { ANAMNESIS_CONDITIONS, conditionLabels, readAnamnesis } from '../../lib/patient.js';

export default function AnamnesisTab({ patient, onSaved }) {
  const ui = useUI();
  const [form, setForm] = useState(() => readAnamnesis(patient.anamnesis));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(readAnamnesis(patient.anamnesis)); }, [patient]);

  const toggle = (id) => setForm((f) => ({ ...f, conditions: f.conditions.includes(id) ? f.conditions.filter((c) => c !== id) : [...f.conditions, id] }));
  const save = async () => {
    setBusy(true);
    try {
      const saved = await Patients.update(patient.id, { anamnesis: { ...form, allergies: form.allergies.trim(), medications: form.medications.trim(), notes: form.notes.trim() } });
      ui.success('Anamnese salva.');
      onSaved(saved);
      setEditing(false);
    } catch (err) { ui.error(err); } finally { setBusy(false); }
  };

  const a = readAnamnesis(patient.anamnesis);
  const has = a.allergies || a.medications || a.conditions.length || a.smoker || a.pregnant || a.notes;

  if (!editing) {
    return (
      <Card>
        <CardHeader title="Anamnese" subtitle="Histórico de saúde do paciente" action={<Button variant="secondary" size="sm" icon="edit" onClick={() => setEditing(true)}>Editar</Button>} />
        {!has ? <p className="p-5 text-muted">Anamnese ainda não preenchida.</p> : (
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="text-sm text-muted">Condições</dt><dd className="mt-1 flex flex-wrap gap-1.5">
              {a.conditions.length ? conditionLabels(a.conditions).map((c) => <Badge key={c} tone="warning">{c}</Badge>) : <span className="text-muted">Nenhuma informada</span>}
              {a.smoker && <Badge tone="warning">Fumante</Badge>}{a.pregnant && <Badge tone="warning">Gestante</Badge>}
            </dd></div>
            <div><dt className="text-sm text-muted">Alergias</dt><dd className="whitespace-pre-wrap font-medium">{a.allergies || '—'}</dd></div>
            <div><dt className="text-sm text-muted">Medicamentos em uso</dt><dd className="whitespace-pre-wrap font-medium">{a.medications || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-sm text-muted">Observações</dt><dd className="whitespace-pre-wrap">{a.notes || '—'}</dd></div>
          </dl>
        )}
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Editar anamnese" />
      <div className="flex flex-col gap-4 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Condições de saúde</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ANAMNESIS_CONDITIONS.map(([id, label]) => <Checkbox key={id} label={label} checked={form.conditions.includes(id)} onChange={() => toggle(id)} />)}
            <Checkbox label="Fumante" checked={form.smoker} onChange={(e) => setForm({ ...form, smoker: e.target.checked })} />
            <Checkbox label="Gestante" checked={form.pregnant} onChange={(e) => setForm({ ...form, pregnant: e.target.checked })} />
          </div>
        </fieldset>
        <Field label="Alergias (medicamentos, látex, anestésicos…)">{({ id }) => <Textarea id={id} value={form.allergies} maxLength={1000} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />}</Field>
        <Field label="Medicamentos em uso">{({ id }) => <Textarea id={id} value={form.medications} maxLength={1000} onChange={(e) => setForm({ ...form, medications: e.target.value })} />}</Field>
        <Field label="Observações">{({ id }) => <Textarea id={id} value={form.notes} maxLength={2000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}</Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setForm(readAnamnesis(patient.anamnesis)); setEditing(false); }}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></div>
      </div>
    </Card>
  );
}
