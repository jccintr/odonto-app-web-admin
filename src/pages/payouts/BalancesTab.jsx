import { useState } from 'react';
import { Payouts } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import { Alert, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Loading, Modal, Select, Table, Textarea, cx } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { PAYMENT_METHOD } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';

function PayModal({ row, until, onClose, onDone }) {
  const ui = useUI();
  const [form, setForm] = useState({ method: 'pix', until, notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const payout = await Payouts.pay({ dentistId: row.dentist.id, until: form.until, method: form.method, notes: form.notes.trim() || undefined });
      ui.success(`Repasse de ${formatMoney(payout.totalCents)} registrado.`);
      onDone(); onClose();
    } catch (err) { setError(err.code === 'NOTHING_TO_PAY' ? 'Não há saldo a repassar a este dentista até essa data.' : errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={`Pagar repasse: ${row.dentist.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Registrar pagamento</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-sm text-muted">Saldo até {formatDay(until)}</p>
        <p className="text-3xl font-bold">{formatMoney(row.balanceCents)}</p>
        <Field label="Pagar tudo que foi realizado até" hint="Para fechar o mês, use o último dia dele. Pagamentos de pacientes estornados depois são descontados.">{({ id }) => <Input id={id} type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value || until })} />}</Field>
        <Field label="Forma de pagamento">{({ id }) => <Select id={id} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{Object.entries(PAYMENT_METHOD).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
        <Field label="Observações">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

export default function BalancesTab() {
  const [until, setUntil] = useState(dayOf());
  const balances = useResource(() => Payouts.balances({ until }), [until]);
  const [paying, setPaying] = useState(null);

  return (
    <Card>
      <CardHeader title="Saldo por dentista" subtitle="O que a clínica deve a cada dentista até a data escolhida."
        action={<Field label="Até" className="flex-row items-center gap-2">{({ id }) => <Input id={id} type="date" className="h-9 w-auto" value={until} onChange={(e) => setUntil(e.target.value || dayOf())} />}</Field>} />
      {balances.loading && !balances.data ? <Loading /> : balances.error ? <div className="p-4"><ErrorState error={balances.error} onRetry={balances.reload} /></div>
        : balances.data.data.length === 0 ? <EmptyState icon="coin" title="Nenhum lançamento de repasse até esta data">Os lançamentos nascem quando um procedimento é registrado como realizado.</EmptyState> : (
          <Table head={['Dentista', { label: 'Procedimentos', right: true }, { label: 'Comissão', right: true }, { label: 'Liberado', right: true }, { label: 'Já pago', right: true }, { label: 'Saldo', right: true }, '']}>
            {balances.data.data.map((row) => (
              <tr key={row.dentist.id}>
                <td className="px-4 py-3 font-medium">{row.dentist.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.entriesCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.commissionCents)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.releasedCents)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.paidCents)}</td>
                <td className={cx('px-4 py-3 text-right font-semibold tabular-nums', row.balanceCents < 0 && 'text-danger')}>{formatMoney(row.balanceCents)}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" disabled={row.balanceCents <= 0} onClick={() => setPaying(row)}>Pagar</Button></td>
              </tr>
            ))}
            <tr className="bg-surface-2 font-semibold">
              <td className="px-4 py-3">Total</td><td />
              {['commissionCents', 'releasedCents', 'paidCents', 'balanceCents'].map((k) => <td key={k} className="px-4 py-3 text-right tabular-nums">{formatMoney(balances.data.totals[k])}</td>)}<td />
            </tr>
          </Table>
        )}
      {balances.data?.data.some((r) => r.balanceCents < 0) && <p className="border-t border-border px-5 py-3 text-sm text-danger">Saldo negativo: um pagamento de paciente foi estornado depois do repasse. O valor será descontado no próximo fechamento.</p>}
      {paying && <PayModal row={paying} until={until} onClose={() => setPaying(null)} onDone={balances.reload} />}
    </Card>
  );
}
