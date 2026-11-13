import PrintPortal from './PrintPortal.jsx';
import { dayOf, formatDay } from '../lib/dates.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

const stateOf = (p) => (p.status === 'pending' && p.overdue ? 'overdue' : p.status);

/** Contas a receber (a lista filtrada da tela Financeiro) para imprimir (A4). Só aparece na impressão. */
export default function ReceivablesPrint({ rows, viewLabel, from, to, clinic }) {
  const active = rows.filter((p) => p.status !== 'canceled');
  const total = active.reduce((t, p) => t + p.amountCents, 0);
  const period = from || to ? `Vencimento ${from ? `de ${formatDay(from)}` : ''}${from && to ? ' ' : ''}${to ? `até ${formatDay(to)}` : ''}` : 'Todos os vencimentos';
  return (
    <PrintPortal>
    <div className="print-area print-only text-[12px] leading-snug" aria-hidden="true" data-testid="receivables-print">
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div><p className="text-xl font-bold">{clinic.name}</p>{clinic.document && <p>{clinic.document}</p>}</div>
        <div className="text-right"><p className="text-lg font-semibold">CONTAS A RECEBER</p><p>Impresso em {formatDay(dayOf())}</p></div>
      </div>
      <p className="mb-3"><strong>Lista:</strong> {viewLabel} · {period}</p>
      {rows.length === 0 ? <p>Nenhum lançamento nesta lista.</p> : (
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-black text-left"><th className="py-1">Vencimento</th><th className="py-1">Paciente</th><th className="py-1">Parcela</th><th className="py-1 text-right">Valor</th><th className="py-1 pl-3">Forma</th><th className="py-1">Situação</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="break-inside-avoid border-b border-gray-300">
                <td className="py-1">{formatDay(p.dueDate)}</td><td className="py-1">{p.patient.name}</td>
                <td className="py-1">{p.installment ? `${p.installment}/${p.installmentsTotal}` : '—'}</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                <td className="py-1 pl-3">{p.method ? PAYMENT_METHOD[p.method] : '—'}</td><td className="py-1">{PAYMENT_STATUS[stateOf(p)].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-3 ml-auto w-64">
        <div className="flex justify-between"><span>Lançamentos (sem cancelados)</span><span>{active.length}</span></div>
        <div className="flex justify-between border-t border-black pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(total)}</span></div>
      </div>
    </div>
    </PrintPortal>
  );
}
