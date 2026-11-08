import { useState } from 'react';
import { Dentists, Payouts } from '../../api/index.js';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Loading, Modal, Pagination, Select, Table, cx } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { PAYMENT_METHOD } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';

function Detail({ id, onClose, onChanged }) {
  const ui = useUI();
  const payout = useResource(() => Payouts.get(id), [id]);
  const cancel = async () => {
    const answer = await ui.confirm({ title: 'Desfazer este fechamento?', message: 'Use quando o pagamento ao dentista não saiu. O saldo volta aos lançamentos.', confirmLabel: 'Desfazer fechamento', danger: true, askReason: true });
    if (!answer) return;
    try { payout.setData(await Payouts.cancel(id, typeof answer === 'string' ? answer : undefined)); ui.success('Fechamento desfeito.'); onChanged(); } catch (err) { ui.error(err); }
  };
  const p = payout.data;
  return (
    <Modal open onClose={onClose} size="lg" title="Fechamento de repasse"
      footer={p?.status === 'paid' ? <Button variant="secondary" className="text-danger" onClick={cancel}>Desfazer fechamento</Button> : undefined}>
      {payout.loading && !p ? <Loading /> : payout.error ? <ErrorState error={payout.error} onRetry={payout.reload} /> : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-lg font-semibold">{p.dentist.name}</p><p className="text-sm text-muted">Pago em {formatDay(dayOf(p.paidAt))} · {PAYMENT_METHOD[p.method]} · procedimentos até {formatDay(p.until)}</p></div>
            <div className="text-right"><p className="text-2xl font-bold">{formatMoney(p.totalCents)}</p>{p.status === 'canceled' ? <Badge tone="danger">Desfeito</Badge> : <Badge tone="success">Pago</Badge>}</div>
          </div>
          {p.notes && <p className="rounded-lg bg-surface-2 p-3 text-sm">{p.notes}</p>}
          {p.canceledReason && <p className="text-sm text-danger">Motivo do cancelamento: {p.canceledReason}</p>}
          <Table head={['Realizado', 'Procedimento', 'Paciente', { label: 'Valor', right: true }]}>
            {p.lines.map((l) => (
              <tr key={l.entryId}>
                <td className="px-4 py-2">{formatDay(dayOf(l.performedAt))}</td><td className="px-4 py-2">{l.procedure}</td><td className="px-4 py-2 text-muted">{l.patient}</td>
                <td className={cx('px-4 py-2 text-right tabular-nums', l.amountCents < 0 && 'text-danger')}>{formatMoney(l.amountCents)}{l.amountCents < 0 && <span className="block text-xs">desconto de estorno</span>}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Modal>
  );
}

export default function PayoutsTab() {
  const [dentistId, setDentistId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const dentists = useResource(() => Dentists.list(), []);
  const list = useResource(() => Payouts.list({ dentistId: dentistId || undefined, status: status || undefined, page, perPage: 20 }), [dentistId, status, page]);

  return (
    <Card>
      <CardHeader title="Fechamentos pagos" subtitle="Histórico de repasses pagos aos dentistas." />
      <div className="flex flex-wrap gap-3 border-b border-border p-3">
        <Select aria-label="Dentista" className="w-auto" value={dentistId} onChange={(e) => { setDentistId(e.target.value); setPage(1); }}><option value="">Todos os dentistas</option>{(dentists.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <Select aria-label="Situação" className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todas as situações</option><option value="paid">Pagos</option><option value="canceled">Desfeitos</option></Select>
      </div>
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : list.data.data.length === 0 ? <EmptyState icon="coin" title="Nenhum fechamento">Os repasses pagos aparecem aqui. Pague em “Saldos”.</EmptyState> : (
          <>
            <Table head={['Pago em', 'Dentista', 'Até', 'Forma', { label: 'Valor', right: true }, 'Situação']}>
              {list.data.data.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(p.id)}>
                  <td className="px-4 py-3">{formatDay(dayOf(p.paidAt))}</td><td className="px-4 py-3 font-medium">{p.dentist.name}</td><td className="px-4 py-3 text-muted">{formatDay(p.until)}</td>
                  <td className="px-4 py-3">{PAYMENT_METHOD[p.method]}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(p.totalCents)}</td>
                  <td className="px-4 py-3">{p.status === 'canceled' ? <Badge tone="danger">Desfeito</Badge> : <Badge tone="success">Pago</Badge>}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
          </>
        )}
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={list.reload} />}
    </Card>
  );
}
