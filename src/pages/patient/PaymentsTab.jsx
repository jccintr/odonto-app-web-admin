import { Link } from 'react-router-dom';
import { Payments } from '../../api/index.js';
import { Card, CardHeader, EmptyState, ErrorState, Loading, StatusBadge, Table, cx } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import { formatDay } from '../../lib/dates.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';

export default function PaymentsTab({ patient }) {
  const list = useResource(() => Payments.list({ patientId: patient.id, perPage: 100 }), [patient.id]);
  const rows = list.data?.data ?? [];
  const sum = (filter) => rows.filter(filter).reduce((t, p) => t + p.amountCents, 0);
  return (
    <Card>
      <CardHeader title="Pagamentos" subtitle={rows.length ? `Recebido ${formatMoney(sum((p) => p.status === 'paid'))} · A receber ${formatMoney(sum((p) => p.status === 'pending'))}` : undefined} />
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : rows.length === 0 ? <EmptyState icon="wallet" title="Nenhum pagamento">Os pagamentos aparecem depois que um orçamento é aprovado.</EmptyState> : (
          <Table head={['Vencimento', 'Parcela', { label: 'Valor', right: true }, 'Forma', 'Situação', '']}>
            {rows.map((p) => (
              <tr key={p.id} className={cx(p.status === 'canceled' && 'opacity-50')}>
                <td className="px-4 py-3">{formatDay(p.dueDate)}</td>
                <td className="px-4 py-3 text-muted">{p.installment ? `${p.installment}/${p.installmentsTotal}` : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                <td className="px-4 py-3">{p.method ? PAYMENT_METHOD[p.method] : '—'}</td>
                <td className="px-4 py-3"><StatusBadge map={PAYMENT_STATUS} value={p.status === 'pending' && p.overdue ? 'overdue' : p.status} /></td>
                <td className="px-4 py-3 text-right"><Link className="text-primary hover:underline" to={`/orcamentos/${p.budgetId}`}>Orçamento</Link></td>
              </tr>
            ))}
          </Table>
        )}
    </Card>
  );
}
