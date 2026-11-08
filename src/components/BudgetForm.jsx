import { useEffect, useMemo, useState } from 'react';
import { Budgets, Dentists } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { useUI } from '../context/UIContext.jsx';
import { loadActiveProcedures, subtotalOf } from '../lib/budget.js';
import { formatMoney } from '../lib/money.js';
import MoneyInput from './MoneyInput.jsx';
import PatientPicker from './PatientPicker.jsx';
import ToothFacesPicker from './ToothFacesPicker.jsx';
import { Alert, Button, Field, IconButton, Modal, Select, Textarea } from './ui.jsx';

let rowId = 0;
const blankRow = () => ({ key: ++rowId, procedureId: '', tooth: null, faces: '', priceCents: null });

/** Novo orçamento: paciente, dentista, procedimentos (com dente/faces e preço editável), desconto e observações. */
export default function BudgetForm({ open, onClose, onSaved, patient: presetPatient }) {
  const ui = useUI();
  const [procedures, setProcedures] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ patient: presetPatient ?? null, dentistId: '', rows: [blankRow()], discountCents: 0, notes: '' });
    setErrors({}); setFormError(null);
    loadActiveProcedures().then(setProcedures).catch((err) => ui.error(err));
    Dentists.list({ active: true }).then(setDentists).catch((err) => ui.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && form && !form.dentistId && dentists.length === 1) setForm((f) => ({ ...f, dentistId: dentists[0].id }));
  }, [open, form, dentists]);

  const byId = useMemo(() => new Map(procedures.map((p) => [p.id, p])), [procedures]);
  if (!open || !form) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (key, patch) => set({ rows: form.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const subtotal = subtotalOf(form.rows);
  const discount = form.discountCents ?? 0;
  const total = Math.max(subtotal - discount, 0);

  const submit = async () => {
    const next = {};
    if (!form.patient) next.patientId = 'Escolha o paciente.';
    if (!form.dentistId) next.dentistId = 'Escolha o dentista responsável.';
    if (form.rows.some((r) => !r.procedureId)) next.items = 'Escolha o procedimento de cada linha (ou remova a linha vazia).';
    else if (form.rows.some((r) => r.priceCents === null)) next.items = 'Informe um valor válido para cada procedimento.';
    if (form.discountCents === null) next.discount = 'Valor de desconto inválido.';
    else if (discount > subtotal) next.discount = 'O desconto não pode ser maior que o total dos procedimentos.';
    setErrors(next); setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const saved = await Budgets.create({
        patientId: form.patient.id, dentistId: form.dentistId, discountCents: discount, notes: form.notes.trim() || undefined,
        items: form.rows.map((r) => ({ procedureId: r.procedureId, tooth: r.tooth ?? undefined, faces: r.faces || undefined, priceCents: r.priceCents })),
      });
      ui.success('Orçamento criado.');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="xl" title="Novo orçamento"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Criar orçamento</Button></>}>
      <div className="flex flex-col gap-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paciente" required error={errors.patientId}>
            {({ id, invalid }) => (presetPatient ? <p className="flex h-10 items-center font-medium">{presetPatient.name}</p> : <PatientPicker id={id} invalid={invalid} value={form.patient} onChange={(patient) => set({ patient })} />)}
          </Field>
          <Field label="Dentista responsável" required error={errors.dentistId}>
            {({ id, invalid }) => (
              <Select id={id} invalid={invalid} value={form.dentistId} onChange={(e) => set({ dentistId: e.target.value })}>
                <option value="">Selecione…</option>
                {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Procedimentos</legend>
          {errors.items && <Alert tone="danger" className="mb-3">{errors.items}</Alert>}
          <ul className="flex flex-col gap-3">
            {form.rows.map((row, index) => (
              <li key={row.key} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_9rem_auto] lg:items-center">
                  <Select aria-label={`Procedimento ${index + 1}`} value={row.procedureId}
                    onChange={(e) => setRow(row.key, { procedureId: e.target.value, priceCents: e.target.value ? byId.get(e.target.value).priceCents : null })}>
                    <option value="">Escolha o procedimento…</option>
                    {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.priceCents)}</option>)}
                  </Select>
                  <ToothFacesPicker idPrefix={`row-${row.key}`} tooth={row.tooth} faces={row.faces} onChange={(patch) => setRow(row.key, patch)} />
                  <MoneyInput aria-label={`Valor do procedimento ${index + 1}`} value={row.priceCents} onChange={(priceCents) => setRow(row.key, { priceCents })} />
                  <IconButton icon="trash" label={`Remover procedimento ${index + 1}`} disabled={form.rows.length === 1} onClick={() => set({ rows: form.rows.filter((r) => r.key !== row.key) })} />
                </div>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" icon="plus" className="mt-3" onClick={() => set({ rows: [...form.rows, blankRow()] })}>Adicionar procedimento</Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Observações">{({ id }) => <Textarea id={id} value={form.notes} maxLength={2000} onChange={(e) => set({ notes: e.target.value })} />}</Field>
          <div className="flex flex-col gap-3">
            <Field label="Desconto" error={errors.discount}>{({ id, invalid }) => <MoneyInput id={id} invalid={invalid} value={form.discountCents} onChange={(discountCents) => set({ discountCents })} />}</Field>
            <dl className="rounded-lg bg-surface-2 p-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd>- {formatMoney(discount)}</dd></div>
              <div className="mt-1 flex justify-between border-t border-border pt-1 text-base font-bold"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </Modal>
  );
}
