import { useSearchParams } from 'react-router-dom';
import { Reports } from '../api/index.js';
import BarChart from '../components/BarChart.jsx';
import ReportPrint from '../components/ReportPrint.jsx';
import { Button, Card, CardHeader, ErrorState, IconButton, Loading, PageHeader, Stat, Table, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useResource from '../hooks/useResource.js';
import { formatMonth, monthOf, shiftMonth } from '../lib/dates.js';
import { PAYMENT_METHOD } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

const percent = (rate) => (rate === null ? '—' : `${Math.round(rate * 1000) / 10}%`.replace('.', ','));
const SHORT_MONTH = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' });
const monthLabel = (m) => { const [y, mo] = m.split('-').map(Number); return SHORT_MONTH.format(new Date(Date.UTC(y, mo - 1, 1))).replace('.', ''); };

export default function ReportsPage() {
  const { clinic } = useAuth();
  const [params, setParams] = useSearchParams();
  const current = monthOf();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('mes') ?? '') ? params.get('mes') : current;
  const go = (m) => setParams(m === current ? {} : { mes: m }, { replace: true });
  const report = useResource(() => Reports.monthly(month), [month]);
  const trend = useResource(() => Reports.trend(month, 6), [month]);
  const r = report.data;

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Resumo gerencial do mês" actions={(
        <div className="no-print flex items-center gap-2">
          <Button variant="secondary" icon="print" disabled={!r} onClick={() => window.print()}>Imprimir</Button>
          <div className="flex items-center gap-1">
          <IconButton icon="chevronLeft" label="Mês anterior" onClick={() => go(shiftMonth(month, -1))} />
          <h2 className="min-w-40 text-center font-semibold" aria-live="polite">{formatMonth(month)}</h2>
          <IconButton icon="chevronRight" label="Próximo mês" disabled={month >= current} onClick={() => go(shiftMonth(month, 1))} />
          </div>
        </div>
      )} />
      {report.loading && !r ? <Loading /> : report.error ? <ErrorState error={report.error} onRetry={report.reload} /> : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Recebido no mês" value={formatMoney(r.cash.receivedCents)} hint={`Líquido de estornos: ${formatMoney(r.cash.netCashCents)}`} />
            <Stat label="Produção" value={formatMoney(r.production.producedCents)} hint={`${r.production.proceduresCount} procedimentos realizados`} />
            <Stat label="Repasses pagos" value={formatMoney(r.payouts.paidCents)} hint={`Comissão gerada: ${formatMoney(r.payouts.commissionCents)}`} />
            <Stat label="Resultado do mês" value={formatMoney(r.resultCents)} tone={r.resultCents < 0 ? 'danger' : 'success'} hint="Caixa líquido menos repasses pagos" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Evolução" subtitle="Últimos 6 meses" />
              <div className="p-4">{trend.data ? <BarChart data={trend.data.data.map((m) => ({ label: monthLabel(m.month), values: [m.receivedCents, m.producedCents] }))} series={[{ name: 'Recebido', color: 'var(--primary)' }, { name: 'Produzido', color: 'var(--info)' }]} /> : <Loading />}</div>
            </Card>
            <Card>
              <CardHeader title="Caixa" />
              <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                <div><dt className="text-muted">Recebido</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.cash.receivedCents)}</dd></div>
                <div><dt className="text-muted">Estornos</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.cash.refundedCents)}</dd></div>
                <div><dt className="text-muted">A receber (no prazo)</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.cash.dueInMonth.pendingCents)}</dd></div>
                <div><dt className="text-muted">Vencido</dt><dd className={cx('text-lg font-semibold tabular-nums', r.cash.dueInMonth.overdueCents > 0 && 'text-danger')}>{formatMoney(r.cash.dueInMonth.overdueCents)}</dd></div>
              </dl>
              {r.cash.byMethod.length > 0 && (
                <Table head={['Forma de pagamento', { label: 'Valor', right: true }]}>
                  {r.cash.byMethod.map((m) => <tr key={m.method}><td className="px-4 py-2">{PAYMENT_METHOD[m.method] ?? m.method}</td><td className="px-4 py-2 text-right tabular-nums">{formatMoney(m.amountCents)}</td></tr>)}
                </Table>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Agenda" />
              <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
                <div><dt className="text-muted">Atendimentos</dt><dd className="text-lg font-semibold">{r.appointments.total}</dd></div>
                <div><dt className="text-muted">Atendidos</dt><dd className="text-lg font-semibold">{r.appointments.attended}</dd></div>
                <div><dt className="text-muted">Faltas</dt><dd className="text-lg font-semibold">{r.appointments.no_show}</dd></div>
                <div><dt className="text-muted">Cancelados</dt><dd className="text-lg font-semibold">{r.appointments.canceled}</dd></div>
                <div><dt className="text-muted">Comparecimento</dt><dd className="text-lg font-semibold">{percent(r.appointments.attendanceRate)}</dd></div>
                <div><dt className="text-muted">Taxa de faltas</dt><dd className="text-lg font-semibold">{percent(r.appointments.noShowRate)}</dd></div>
              </dl>
            </Card>
            <Card>
              <CardHeader title="Orçamentos e pacientes" />
              <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
                <div><dt className="text-muted">Criados</dt><dd className="text-lg font-semibold">{r.budgets.createdCount}</dd></div>
                <div><dt className="text-muted">Recusados</dt><dd className="text-lg font-semibold">{r.budgets.rejectedCount}</dd></div>
                <div><dt className="text-muted">Aprovados</dt><dd className="text-lg font-semibold">{r.budgets.approvedCount}</dd></div>
                <div><dt className="text-muted">Valor aprovado</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.budgets.approvedCents)}</dd></div>
                <div><dt className="text-muted">Conversão</dt><dd className="text-lg font-semibold">{percent(r.budgets.conversionRate)}</dd></div>
                <div><dt className="text-muted">Pacientes novos</dt><dd className="text-lg font-semibold">{r.newPatients}</dd></div>
              </dl>
            </Card>
            <Card>
              <CardHeader title="Repasse" />
              <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
                <div><dt className="text-muted">Comissão gerada</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.payouts.commissionCents)}</dd></div>
                <div><dt className="text-muted">Pago no mês</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.payouts.paidCents)}</dd></div>
                <div className="col-span-2"><dt className="text-muted">Devido aos dentistas no fim do mês</dt><dd className="text-lg font-semibold tabular-nums">{formatMoney(r.payouts.balanceAtEndCents)}</dd></div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Procedimentos mais produtivos" />
              {r.production.topProcedures.length === 0 ? <p className="p-5 text-muted">Nenhum procedimento realizado no mês.</p> : (
                <Table head={['Procedimento', { label: 'Qtd.', right: true }, { label: 'Produzido', right: true }]}>
                  {r.production.topProcedures.map((t) => <tr key={t.procedure.id}><td className="px-4 py-2 font-medium">{t.procedure.name}</td><td className="px-4 py-2 text-right tabular-nums">{t.count}</td><td className="px-4 py-2 text-right tabular-nums">{formatMoney(t.producedCents)}</td></tr>)}
                </Table>
              )}
            </Card>
            <Card>
              <CardHeader title="Por dentista" />
              {r.dentists.length === 0 ? <p className="p-5 text-muted">Sem movimento no mês.</p> : (
                <Table head={['Dentista', { label: 'Proc.', right: true }, { label: 'Produção', right: true }, { label: 'Comissão', right: true }, { label: 'Atend.', right: true }]}>
                  {r.dentists.map((d) => <tr key={d.dentist.id}><td className="px-4 py-2 font-medium">{d.dentist.name}</td><td className="px-4 py-2 text-right tabular-nums">{d.proceduresCount}</td><td className="px-4 py-2 text-right tabular-nums">{formatMoney(d.producedCents)}</td><td className="px-4 py-2 text-right tabular-nums">{formatMoney(d.commissionCents)}</td><td className="px-4 py-2 text-right tabular-nums">{d.attendedCount}</td></tr>)}
                </Table>
              )}
            </Card>
          </div>
        </div>
      )}
      {r && <ReportPrint report={r} month={month} clinic={clinic} />}
    </>
  );
}
