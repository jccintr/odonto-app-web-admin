import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Payments } from '../api/index.js';
import { ReceiveModal } from '../components/PaymentModals.jsx';
import ReceivablesPrint from '../components/ReceivablesPrint.jsx';
import { Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader, Pagination, Stat, StatusBadge, Table, Tabs, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

const VIEWS = [
  { id: 'vencidas', label: 'Vencidas', query: { overdue: true } },
  { id: 'a-receber', label: 'A receber', query: { status: 'pending' } },
  { id: 'recebidas', label: 'Recebidas', query: { status: 'paid' } },
  { id: 'todas', label: 'Todas', query: {} },
];

const stateOf = (p) => (p.status === 'pending' && p.overdue ? 'overdue' : p.status);

export default function FinancePage() {
  const { isAdmin, clinic } = useAuth();
  const ui = useUI();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v.id === params.get('ver')) ?? VIEWS[0];
  const page = Number(params.get('pagina') ?? 1);
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  const [receiving, setReceiving] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [sheet, setSheet] = useState(null); // lista completa (todas as páginas) a imprimir

  // a folha só entra na página depois de pronta; aí abre a impressão e limpa quando fechar
  useEffect(() => {
    if (!sheet) return undefined;
    const done = () => setSheet(null);
    window.addEventListener('afterprint', done, { once: true });
    const timer = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', done); };
  }, [sheet]);

  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const list = useResource(() => Payments.list({ ...view.query, dueFrom: from || undefined, dueTo: to || undefined, page, perPage: 20 }), [view.id, from, to, page]);
  const overdue = useResource(() => Payments.list({ overdue: true, perPage: 100 }), []);
  const overdueSum = (overdue.data?.data ?? []).reduce((t, p) => t + p.amountCents, 0);
  const pageSum = (list.data?.data ?? []).filter((p) => p.status !== 'canceled').reduce((t, p) => t + p.amountCents, 0);

  const reload = () => { list.reload(); overdue.reload(); };
  // imprime a lista inteira com os filtros atuais (a tela pagina de 20 em 20; a API devolve até 100 por vez)
  const print = async () => {
    setPrinting(true);
    try {
      const query = { ...view.query, dueFrom: from || undefined, dueTo: to || undefined, perPage: 100 };
      const first = await Payments.list({ ...query, page: 1 });
      const rest = await Promise.all(Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) => Payments.list({ ...query, page: i + 2 })));
      setSheet({ rows: [first, ...rest].flatMap((r) => r.data), viewLabel: view.label, from, to });
    } catch (err) { ui.error(err); } finally { setPrinting(false); }
  };
  const cancel = async (p) => {
    const answer = await ui.confirm({
      title: p.status === 'paid' ? 'Estornar pagamento?' : 'Cancelar parcela?', message: `${p.patient.name} — ${formatMoney(p.amountCents)}`,
      confirmLabel: p.status === 'paid' ? 'Estornar' : 'Cancelar parcela', danger: true, askReason: true,
    });
    if (!answer) return;
    try { await Payments.cancel(p.id, typeof answer === 'string' ? answer : undefined); ui.success('Pagamento cancelado.'); reload(); } catch (err) { ui.error(err); }
  };

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Contas a receber dos pacientes" actions={<Button variant="secondary" icon="print" className="no-print" loading={printing} onClick={print}>Imprimir</Button>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Total vencido" value={overdue.data ? formatMoney(overdueSum) : '…'} tone={overdueSum > 0 ? 'danger' : undefined} hint={overdue.data ? `${overdue.data.total} parcelas` : undefined} />
        <Stat label={`Nesta lista (${view.label.toLowerCase()})`} value={list.data ? formatMoney(pageSum) : '…'} hint="soma da página atual" />
        <Stat label="Hoje" value={formatDay(dayOf())} />
      </div>
      <Card>
        <Tabs tabs={VIEWS} value={view.id} onChange={(id) => go({ ver: id === 'vencidas' ? null : id, pagina: null })} />
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-3">
          <label className="flex flex-col gap-1 text-sm"><span className="text-muted">Vencimento de</span><Input type="date" className="h-9" value={from} onChange={(e) => go({ de: e.target.value, pagina: null })} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-muted">até</span><Input type="date" className="h-9" value={to} onChange={(e) => go({ ate: e.target.value, pagina: null })} /></label>
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => go({ de: null, ate: null })}>Limpar datas</Button>}
        </div>
        {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
          : list.data.data.length === 0 ? <EmptyState icon="wallet" title="Nada por aqui">{view.id === 'vencidas' ? 'Nenhuma parcela vencida. Tudo em dia!' : 'Nenhum lançamento nesta lista.'}</EmptyState> : (
            <>
              <Table head={['Vencimento', 'Paciente', 'Parcela', { label: 'Valor', right: true }, 'Forma', 'Situação', '']}>
                {list.data.data.map((p) => (
                  <tr key={p.id} className={cx(p.status === 'canceled' && 'opacity-50')}>
                    <td className="px-4 py-3">{formatDay(p.dueDate)}</td>
                    <td className="px-4 py-3 font-medium"><Link to={`/orcamentos/${p.budgetId}`} className="hover:text-primary hover:underline">{p.patient.name}</Link></td>
                    <td className="px-4 py-3 text-muted">{p.installment ? `${p.installment}/${p.installmentsTotal}` : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                    <td className="px-4 py-3">{p.method ? PAYMENT_METHOD[p.method] : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge map={PAYMENT_STATUS} value={stateOf(p)} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {p.status === 'pending' && <Button size="sm" variant="soft" onClick={() => setReceiving(p)}>Receber</Button>}
                      {(p.status === 'pending' || (p.status === 'paid' && isAdmin)) && <Button size="sm" variant="ghost" className="text-danger" onClick={() => cancel(p)}>{p.status === 'paid' ? 'Estornar' : 'Cancelar'}</Button>}
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={(n) => go({ pagina: n > 1 ? String(n) : null })} />
            </>
          )}
      </Card>
      {sheet && <ReceivablesPrint rows={sheet.rows} viewLabel={sheet.viewLabel} from={sheet.from} to={sheet.to} clinic={clinic} />}
      <ReceiveModal payment={receiving} onClose={() => setReceiving(null)} onDone={reload} />
    </>
  );
}
