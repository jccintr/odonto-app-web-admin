import PrintPortal from './PrintPortal.jsx';
import { dayOf, formatDay, formatMonth } from '../lib/dates.js';
import { PAYMENT_METHOD } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

const percent = (rate) => (rate === null ? '—' : `${Math.round(rate * 1000) / 10}%`.replace('.', ','));

function Section({ title, children }) {
  return <section className="mb-4 break-inside-avoid"><h2 className="mb-1 border-b border-gray-400 font-bold uppercase">{title}</h2>{children}</section>;
}

function Pairs({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
      {items.map(([label, value]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><strong className="tabular-nums">{value}</strong></div>)}
    </div>
  );
}

function Rows({ head, rows }) {
  return (
    <table className="w-full border-collapse">
      <thead><tr className="border-b border-black text-left">{head.map(([label, right]) => <th key={label} className={`py-1 ${right ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
      <tbody>{rows.map((cells, i) => <tr key={i} className="border-b border-gray-300">{cells.map((cell, j) => <td key={j} className={`py-1 ${head[j][1] ? 'text-right tabular-nums' : ''}`}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

/** Relatório gerencial do mês para imprimir (A4). Só aparece na impressão. */
export default function ReportPrint({ report: r, month, clinic }) {
  return (
    <PrintPortal>
    <div className="print-area print-only text-[12px] leading-snug" aria-hidden="true" data-testid="report-print">
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div><p className="text-xl font-bold">{clinic.name}</p>{clinic.document && <p>{clinic.document}</p>}</div>
        <div className="text-right"><p className="text-lg font-semibold">RELATÓRIO GERENCIAL</p><p>{formatMonth(month)} · impresso em {formatDay(dayOf())}</p></div>
      </div>

      <Section title="Resumo">
        <Pairs items={[
          ['Recebido no mês', formatMoney(r.cash.receivedCents)], ['Produção', formatMoney(r.production.producedCents)],
          ['Estornos', formatMoney(r.cash.refundedCents)], ['Procedimentos realizados', r.production.proceduresCount],
          ['Caixa líquido', formatMoney(r.cash.netCashCents)], ['Repasses pagos', formatMoney(r.payouts.paidCents)],
          ['Resultado do mês (caixa líquido − repasses pagos)', formatMoney(r.resultCents)], ['Comissão gerada', formatMoney(r.payouts.commissionCents)],
        ]} />
      </Section>

      <Section title="Caixa">
        <Pairs items={[['A receber (no prazo)', formatMoney(r.cash.dueInMonth.pendingCents)], ['Vencido', formatMoney(r.cash.dueInMonth.overdueCents)]]} />
        {r.cash.byMethod.length > 0 && (
          <div className="mt-2"><Rows head={[['Forma de pagamento'], ['Valor', true]]} rows={r.cash.byMethod.map((m) => [PAYMENT_METHOD[m.method] ?? m.method, formatMoney(m.amountCents)])} /></div>
        )}
      </Section>

      <Section title="Repasse aos dentistas">
        <Pairs items={[['Comissão gerada', formatMoney(r.payouts.commissionCents)], ['Pago no mês', formatMoney(r.payouts.paidCents)], ['Devido aos dentistas no fim do mês', formatMoney(r.payouts.balanceAtEndCents)]]} />
      </Section>

      <Section title="Por dentista">
        {r.dentists.length === 0 ? <p>Sem movimento no mês.</p> : (
          <Rows head={[['Dentista'], ['Proc.', true], ['Produção', true], ['Comissão', true], ['Atend.', true]]}
            rows={r.dentists.map((d) => [d.dentist.name, d.proceduresCount, formatMoney(d.producedCents), formatMoney(d.commissionCents), d.attendedCount])} />
        )}
      </Section>

      <Section title="Procedimentos mais produtivos">
        {r.production.topProcedures.length === 0 ? <p>Nenhum procedimento realizado no mês.</p> : (
          <Rows head={[['Procedimento'], ['Qtd.', true], ['Produzido', true]]} rows={r.production.topProcedures.map((t) => [t.procedure.name, t.count, formatMoney(t.producedCents)])} />
        )}
      </Section>

      <div className="grid grid-cols-2 gap-8">
        <Section title="Agenda">
          <Pairs items={[['Atendimentos', r.appointments.total], ['Atendidos', r.appointments.attended], ['Faltas', r.appointments.no_show], ['Cancelados', r.appointments.canceled], ['Comparecimento', percent(r.appointments.attendanceRate)], ['Taxa de faltas', percent(r.appointments.noShowRate)]]} />
        </Section>
        <Section title="Orçamentos e pacientes">
          <Pairs items={[['Criados', r.budgets.createdCount], ['Recusados', r.budgets.rejectedCount], ['Aprovados', r.budgets.approvedCount], ['Valor aprovado', formatMoney(r.budgets.approvedCents)], ['Conversão', percent(r.budgets.conversionRate)], ['Pacientes novos', r.newPatients]]} />
        </Section>
      </div>
    </div>
    </PrintPortal>
  );
}
