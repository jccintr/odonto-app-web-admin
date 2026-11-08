import { dayOf, formatDay } from '../lib/dates.js';
import { itemLabel } from '../lib/budget.js';
import { formatMoney } from '../lib/money.js';

/** Orçamento para imprimir (só aparece na impressão). */
export default function BudgetPrint({ budget, clinic }) {
  return (
    <div className="print-area print-only text-sm" aria-hidden="true">
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div><p className="text-xl font-bold">{clinic.name}</p>{clinic.document && <p>{clinic.document}</p>}</div>
        <p className="text-lg font-semibold">ORÇAMENTO</p>
      </div>
      <p><strong>Paciente:</strong> {budget.patient.name}</p>
      <p><strong>Dentista:</strong> {budget.dentist.name}</p>
      <p className="mb-3"><strong>Data:</strong> {formatDay(dayOf(budget.createdAt))}</p>
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-black text-left"><th className="py-1">Procedimento</th><th className="py-1 text-right">Valor</th></tr></thead>
        <tbody>
          {budget.items.filter((i) => i.status !== 'canceled').map((item) => (
            <tr key={item.id} className="border-b border-gray-400"><td className="py-1">{itemLabel(item)}</td><td className="py-1 text-right">{formatMoney(item.priceCents)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 ml-auto w-64">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(budget.subtotalCents)}</span></div>
        {budget.discountCents > 0 && <div className="flex justify-between"><span>Desconto</span><span>- {formatMoney(budget.discountCents)}</span></div>}
        <div className="flex justify-between border-t border-black pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(budget.totalCents)}</span></div>
      </div>
      {budget.notes && <p className="mt-4 whitespace-pre-wrap"><strong>Observações:</strong> {budget.notes}</p>}
      <div className="mt-16 grid grid-cols-2 gap-12 text-center"><div className="border-t border-black pt-1">Paciente</div><div className="border-t border-black pt-1">{budget.dentist.name}</div></div>
    </div>
  );
}
