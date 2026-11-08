import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Budgets, Notices, Payments } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import ApprovalModal from '../components/ApprovalModal.jsx';
import BudgetPrint from '../components/BudgetPrint.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import { NewPaymentModal, PlanModal, ReceiveModal } from '../components/PaymentModals.jsx';
import { Alert, Badge, Button, Card, CardHeader, ErrorState, Field, Loading, Modal, PageHeader, StatusBadge, Table, Textarea, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { BUDGET_STATUS, ITEM_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

const paymentState = (p) => (p.status === 'pending' && p.overdue ? 'overdue' : p.status);

function DiscountModal({ budget, onClose, onDone }) {
  const [discount, setDiscount] = useState(budget.discountCents);
  const [notes, setNotes] = useState(budget.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    setBusy(true); setError(null);
    try { onDone(await Budgets.update(budget.id, { discountCents: discount, notes: notes.trim() || null })); onClose(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Desconto e observações"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={discount === null} onClick={save}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Desconto" hint={`Subtotal: ${formatMoney(budget.subtotalCents)}`}>{({ id }) => <MoneyInput id={id} value={discount} onChange={setDiscount} />}</Field>
        <Field label="Observações">{({ id }) => <Textarea id={id} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

export default function BudgetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ui = useUI();
  const { clinic, isAdmin } = useAuth();
  const budget = useResource(() => Budgets.get(id), [id]);
  const finance = useResource(() => Budgets.payments(id), [id]);
  const [modal, setModal] = useState(null); // { type, item?, payment? }
  const [busy, setBusy] = useState(null);

  if (budget.loading && !budget.data) return <Loading />;
  if (budget.error) return <ErrorState error={budget.error.status === 404 ? { message: 'Orçamento não encontrado.' } : budget.error} onRetry={budget.error.status === 404 ? () => navigate('/orcamentos') : budget.reload} />;
  const b = budget.data;
  const open = b.status === 'open';
  const hasProposed = b.items.some((item) => item.status === 'pending' && !item.approvalId);
  const hasPayments = ['approved', 'completed'].includes(b.status);
  const reloadAll = () => { budget.reload(); finance.reload(); };
  const apply = (saved) => { budget.setData(saved); finance.reload(); };
  const close = () => setModal(null);

  const setStatus = async (status, label) => {
    if (status === 'rejected' && !(await ui.confirm({ title: 'Recusar orçamento?', message: 'Você poderá reabri-lo depois.', confirmLabel: 'Recusar', danger: true }))) return;
    setBusy(status);
    try { apply(await Budgets.setStatus(b.id, status)); ui.success(label); } catch (err) { ui.error(err); } finally { setBusy(null); }
  };

  const cancelItem = async (item) => {
    if (!(await ui.confirm({ title: 'O paciente desistiu deste procedimento?', message: `${item.procedure.name}. O valor sai do total do orçamento.`, confirmLabel: 'Cancelar procedimento', danger: true }))) return;
    try { apply(await Budgets.cancelItem(b.id, item.id)); } catch (err) { ui.error(err); }
  };

  const sendEmail = async () => {
    setBusy('email');
    try {
      const notice = await Notices.budgetEmail(b.id);
      if (notice.status === 'sent') ui.success(`Orçamento enviado para ${notice.recipient}.`); else ui.error(`Não foi possível enviar o e-mail: ${notice.lastError}`);
    } catch (err) { ui.error(err); } finally { setBusy(null); }
  };
  const sendWhatsapp = async () => {
    setBusy('whatsapp');
    try { window.open((await Notices.budgetWhatsapp(b.id)).url, '_blank', 'noopener'); } catch (err) { ui.error(err); } finally { setBusy(null); }
  };

  const cancelPayment = async (p) => {
    const answer = await ui.confirm({
      title: p.status === 'paid' ? 'Estornar pagamento?' : 'Cancelar parcela?', message: `${formatMoney(p.amountCents)} — ${p.status === 'paid' ? 'o valor volta para o saldo do orçamento.' : 'a parcela deixa de existir.'}`,
      confirmLabel: p.status === 'paid' ? 'Estornar' : 'Cancelar parcela', danger: true, askReason: true,
    });
    if (!answer) return;
    try { await Payments.cancel(p.id, typeof answer === 'string' ? answer : undefined); ui.success('Pagamento cancelado.'); reloadAll(); } catch (err) { ui.error(err); }
  };

  const summary = finance.data?.summary;
  const payments = finance.data?.data ?? [];
  const rounds = finance.data?.approvals ?? [];

  return (
    <>
      <div className="no-print">
        <p className="mb-2 text-sm"><Link to="/orcamentos" className="text-primary hover:underline">← Orçamentos</Link></p>
        <PageHeader
          title={<span className="flex flex-wrap items-center gap-3">Orçamento <StatusBadge map={BUDGET_STATUS} value={b.status} /></span>}
          subtitle={<><Link to={`/pacientes/${b.patient.id}`} className="font-medium text-primary hover:underline">{b.patient.name}</Link> · {b.dentist.name} · {formatDay(dayOf(b.createdAt))}</>}
          actions={(
            <>
              {open && <Button icon="check" onClick={() => setModal({ type: 'approve' })}>Aprovar</Button>}
              {b.status === 'approved' && hasProposed && <Button icon="check" onClick={() => setModal({ type: 'approve' })}>Aprovar mais procedimentos</Button>}
              {open && <Button variant="secondary" loading={busy === 'rejected'} onClick={() => setStatus('rejected', 'Orçamento recusado.')}>Recusar</Button>}
              {b.status === 'rejected' && <Button variant="secondary" loading={busy === 'open'} onClick={() => setStatus('open', 'Orçamento reaberto.')}>Reabrir</Button>}
              <Button variant="secondary" icon="mail" loading={busy === 'email'} onClick={sendEmail}>E-mail</Button>
              <Button variant="secondary" icon="whatsapp" loading={busy === 'whatsapp'} onClick={sendWhatsapp}>WhatsApp</Button>
              <Button variant="secondary" icon="print" onClick={() => window.print()}>Imprimir</Button>
            </>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardHeader title="Procedimentos"  />
            <Table head={['Procedimento', 'Dente', { label: 'Valor', right: true }, 'Situação', '']}>
              {b.items.map((item) => (
                <tr key={item.id} className={cx(item.status === 'canceled' && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium">{item.procedure.name}</td>
                  <td className="px-4 py-3 text-muted">{item.tooth ? `${item.tooth}${item.faces ? ` (${item.faces})` : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.priceCents)}</td>
                  <td className="px-4 py-3"><StatusBadge map={ITEM_STATUS} value={item.status === 'pending' && !item.approvalId ? 'proposed' : item.status} />{item.performedAt && <span className="ml-2 text-xs text-muted">{formatDay(dayOf(item.performedAt))}</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {b.status === 'approved' && item.status === 'pending' && isAdmin && <Button size="sm" variant="ghost" className="text-danger" onClick={() => cancelItem(item)}>Desistiu</Button>}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card>
            <CardHeader title="Resumo" action={open && isAdmin && <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'discount' })}>Desconto</Button>} />
            <dl className="flex flex-col gap-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(b.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd className="tabular-nums">- {formatMoney(b.discountCents)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(b.totalCents)}</dd></div>
              {b.approvals.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                  <dt className="text-muted">Aprovações do paciente</dt>
                  {b.approvals.map((a, i) => (
                    <dd key={a.id} className="flex justify-between tabular-nums"><span>{i + 1}ª · {formatDay(dayOf(a.createdAt))} · {a.itemsCount} proc.{a.discountCents > 0 ? ` (desc. ${formatMoney(a.discountCents)})` : ''}</span><span>{formatMoney(a.totalCents)}</span></dd>
                  ))}
                </div>
              )}
              {b.notes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-muted">{b.notes}</p>}
            </dl>
          </Card>
        </div>

        {hasPayments && (
          <Card className="mt-4">
            <CardHeader title="Pagamentos" action={(
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon="plus" onClick={() => setModal({ type: 'payment' })} disabled={!summary || summary.balanceCents <= 0}>Lançar</Button>
                <Button size="sm" icon="calendar" onClick={() => setModal({ type: 'plan' })} disabled={!summary || summary.balanceCents <= 0}>Gerar parcelas</Button>
              </div>
            )} />
            {finance.loading && !finance.data ? <Loading /> : finance.error ? <div className="p-4"><ErrorState error={finance.error} onRetry={finance.reload} /></div> : (
              <>
                <dl className="grid grid-cols-2 gap-4 border-b border-border p-5 text-sm sm:grid-cols-5">
                  {[['Total', summary.totalCents], ['Recebido', summary.paidCents], ['A receber', summary.pendingCents], ['Vencido', summary.overdueCents], ['Sem lançamento', summary.balanceCents]].map(([label, value]) => (
                    <div key={label}><dt className="text-muted">{label}</dt><dd className={cx('text-lg font-semibold tabular-nums', label === 'Vencido' && value > 0 && 'text-danger')}>{formatMoney(value)}</dd></div>
                  ))}
                </dl>
                {payments.length === 0 ? <p className="p-5 text-muted">Nenhum pagamento lançado ainda.</p> : (
                  <Table head={['Vencimento', 'Parcela', { label: 'Valor', right: true }, 'Forma', 'Situação', '']}>
                    {payments.map((p) => (
                      <tr key={p.id} className={cx(p.status === 'canceled' && 'opacity-50')}>
                        <td className="px-4 py-3">{formatDay(p.dueDate)}</td>
                        <td className="px-4 py-3 text-muted">{p.installment ? `${p.installment}/${p.installmentsTotal}` : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                        <td className="px-4 py-3">{p.method ? PAYMENT_METHOD[p.method] : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge map={PAYMENT_STATUS} value={paymentState(p)} />{p.paidAt && <span className="ml-2 text-xs text-muted">{formatDay(dayOf(p.paidAt))}</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {p.status === 'pending' && <Button size="sm" variant="soft" onClick={() => setModal({ type: 'receive', payment: p })}>Receber</Button>}
                          {(p.status === 'pending' || (p.status === 'paid' && isAdmin)) && <Button size="sm" variant="ghost" className="text-danger" onClick={() => cancelPayment(p)}>{p.status === 'paid' ? 'Estornar' : 'Cancelar'}</Button>}
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </>
            )}
          </Card>
        )}
        {b.status === 'open' && <Alert tone="info" className="mt-4">Aprove o orçamento para lançar pagamentos. Os procedimentos aprovados ficam "a realizar" e são executados pelo dentista durante o atendimento.</Alert>}
      </div>

      <BudgetPrint budget={b} clinic={clinic} />
      {modal?.type === 'approve' && <ApprovalModal budget={b} onClose={close} onDone={(saved) => { apply(saved); ui.success('Aprovação registrada.'); }} />}
      {modal?.type === 'discount' && <DiscountModal budget={b} onClose={close} onDone={apply} />}
      {modal?.type === 'receive' && <ReceiveModal payment={modal.payment} onClose={close} onDone={reloadAll} />}
      <NewPaymentModal open={modal?.type === 'payment'} budgetId={b.id} rounds={rounds} onClose={close} onDone={reloadAll} />
      <PlanModal open={modal?.type === 'plan'} budgetId={b.id} rounds={rounds} onClose={close} onDone={reloadAll} />
    </>
  );
}
