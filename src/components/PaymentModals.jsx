import { useEffect, useState } from 'react';
import { Budgets, Payments } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { useUI } from '../context/UIContext.jsx';
import { addDays, dayOf, toIso } from '../lib/dates.js';
import { PAYMENT_METHOD } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';
import MoneyInput from './MoneyInput.jsx';
import { Alert, Button, Field, Input, Modal, Select, Textarea } from './ui.jsx';

const METHODS = Object.entries(PAYMENT_METHOD);
/** "hoje" vira o instante atual; outro dia vira meio-dia de Brasília (a API guarda instante, a tela mostra o dia) */
const paidAtOf = (day) => (day === dayOf() ? new Date().toISOString() : toIso(day, '12:00'));

function useSubmit(onDone, onClose, successMessage) {
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState({});
  const run = async (fn) => {
    setBusy(true); setError(null); setFields({});
    try { const result = await fn(); ui.success(successMessage); onDone?.(result); onClose(); } catch (err) { setError(errorMessage(err)); setFields(fieldErrors(err)); } finally { setBusy(false); }
  };
  return { busy, error, fields, run };
}

/** Registrar o recebimento de uma parcela */
export function ReceiveModal({ payment, onClose, onDone }) {
  const [method, setMethod] = useState('pix');
  const [day, setDay] = useState(dayOf());
  const { busy, error, run } = useSubmit(onDone, onClose, 'Recebimento registrado.');
  if (!payment) return null;
  return (
    <Modal open onClose={onClose} size="sm" title="Registrar recebimento"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => run(() => Payments.pay(payment.id, { method, paidAt: paidAtOf(day) }))}>Confirmar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p><span className="text-muted">{payment.patient.name}</span><br /><strong className="text-2xl">{formatMoney(payment.amountCents)}</strong></p>
        <Field label="Forma de pagamento">{({ id }) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
        <Field label="Data do recebimento">{({ id }) => <Input id={id} type="date" max={dayOf()} value={day} onChange={(e) => setDay(e.target.value || dayOf())} />}</Field>
      </div>
    </Modal>
  );
}

/** Rodada de aprovação cobrada: escolhe-se quando há mais de uma (cada uma tem o próprio total e saldo) */
function useRound(open, rounds) {
  const firstOpen = () => (rounds.find((r) => r.balanceCents > 0) ?? rounds[0])?.approvalId ?? '';
  const [approvalId, setApprovalId] = useState(firstOpen);
  useEffect(() => { if (open) setApprovalId(firstOpen()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  const current = rounds.find((r) => r.approvalId === approvalId) ?? rounds[0];
  return { approvalId: current?.approvalId, balanceCents: current?.balanceCents ?? 0, setApprovalId };
}

function RoundField({ rounds, approvalId, onChange }) {
  if (rounds.length < 2) return null;
  return (
    <Field label="Aprovação">
      {({ id }) => (
        <Select id={id} value={approvalId} onChange={(e) => onChange(e.target.value)}>
          {rounds.map((r, i) => <option key={r.approvalId} value={r.approvalId}>Aprovação {i + 1} — total {formatMoney(r.totalCents)}, saldo {formatMoney(r.balanceCents)}</option>)}
        </Select>
      )}
    </Field>
  );
}

/** Lançar valor recebido agora ou uma parcela a receber */
export function NewPaymentModal({ open, budgetId, rounds, onClose, onDone }) {
  const [mode, setMode] = useState('received');
  const [amount, setAmount] = useState(null);
  const [method, setMethod] = useState('pix');
  const [day, setDay] = useState(dayOf());
  const [due, setDue] = useState(addDays(dayOf(), 30));
  const [notes, setNotes] = useState('');
  const { busy, error, fields, run } = useSubmit(onDone, onClose, 'Pagamento lançado.');
  const { approvalId, balanceCents, setApprovalId } = useRound(open, rounds);
  useEffect(() => { if (open) { setMode('received'); setAmount(balanceCents || null); setNotes(''); setDay(dayOf()); setDue(addDays(dayOf(), 30)); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, approvalId]);
  if (!open) return null;
  const submit = () => run(() => Budgets.addPayment(budgetId, {
    amountCents: amount, approvalId, notes: notes.trim() || undefined,
    ...(mode === 'received' ? { method, paidAt: paidAtOf(day) } : { dueDate: due }),
  }));
  return (
    <Modal open onClose={onClose} title="Lançar pagamento"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!amount} onClick={submit}>Lançar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <RoundField rounds={rounds} approvalId={approvalId} onChange={setApprovalId} />
        <div className="flex rounded-lg border border-border p-0.5 text-sm" role="group" aria-label="Tipo de lançamento">
          {[['received', 'Recebido agora'], ['pending', 'Parcela a receber']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`flex-1 rounded-md px-3 py-1.5 ${mode === id ? 'bg-primary text-primary-fg' : 'text-muted'}`}>{label}</button>
          ))}
        </div>
        <Field label="Valor" error={fields.amountCents} hint={`Saldo sem lançamento: ${formatMoney(balanceCents)}`}>{({ id, invalid }) => <MoneyInput id={id} invalid={invalid} value={amount} onChange={setAmount} />}</Field>
        {mode === 'received' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Forma de pagamento">{({ id }) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
            <Field label="Data">{({ id }) => <Input id={id} type="date" max={dayOf()} value={day} onChange={(e) => setDay(e.target.value || dayOf())} />}</Field>
          </div>
        ) : (
          <Field label="Vencimento" error={fields.dueDate}>{({ id }) => <Input id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
        )}
        <Field label="Observações">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

/** Gerar parcelas mensais com o saldo (ou um valor) do orçamento */
export function PlanModal({ open, budgetId, rounds, onClose, onDone }) {
  const [installments, setInstallments] = useState(3);
  const [first, setFirst] = useState(addDays(dayOf(), 30));
  const [amount, setAmount] = useState(null);
  const { busy, error, fields, run } = useSubmit(onDone, onClose, 'Parcelas geradas.');
  const { approvalId, balanceCents, setApprovalId } = useRound(open, rounds);
  useEffect(() => { if (open) { setAmount(balanceCents || null); setInstallments(3); setFirst(addDays(dayOf(), 30)); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, approvalId]);
  if (!open) return null;
  const each = amount && installments ? Math.floor(amount / installments) : 0;
  return (
    <Modal open onClose={onClose} title="Gerar parcelas"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!amount || !installments} onClick={() => run(() => Budgets.plan(budgetId, { installments: Number(installments), firstDueDate: first, amountCents: amount, approvalId }))}>Gerar parcelas</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <RoundField rounds={rounds} approvalId={approvalId} onChange={setApprovalId} />
        <Field label="Valor a parcelar" error={fields.amountCents} hint={`Saldo sem lançamento: ${formatMoney(balanceCents)}`}>{({ id, invalid }) => <MoneyInput id={id} invalid={invalid} value={amount} onChange={setAmount} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Número de parcelas" error={fields.installments}>{({ id }) => <Input id={id} type="number" min={1} max={48} value={installments} onChange={(e) => setInstallments(e.target.value)} />}</Field>
          <Field label="Primeiro vencimento" error={fields.firstDueDate}>{({ id }) => <Input id={id} type="date" value={first} onChange={(e) => setFirst(e.target.value)} />}</Field>
        </div>
        {each > 0 && <p className="rounded-lg bg-surface-2 p-3 text-sm">{installments}x de aproximadamente <strong>{formatMoney(each)}</strong>, uma por mês no mesmo dia. Os centavos que sobrarem entram nas primeiras parcelas.</p>}
      </div>
    </Modal>
  );
}
