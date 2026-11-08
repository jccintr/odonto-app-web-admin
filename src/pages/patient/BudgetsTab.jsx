import { useNavigate } from 'react-router-dom';
import { Budgets } from '../../api/index.js';
import { Card, CardHeader, EmptyState, ErrorState, Loading, StatusBadge, Table } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { BUDGET_STATUS } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';

export default function BudgetsTab({ patient }) {
  const navigate = useNavigate();
  const list = useResource(() => Budgets.list({ patientId: patient.id, perPage: 100 }), [patient.id]);
  return (
    <Card>
      <CardHeader title="Orçamentos" />
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : list.data.data.length === 0 ? <EmptyState icon="clipboard" title="Nenhum orçamento">Os orçamentos são montados pelo dentista, no aplicativo.</EmptyState> : (
          <Table head={['Data', 'Dentista', 'Itens', { label: 'Total', right: true }, 'Situação']}>
            {list.data.data.map((b) => (
              <tr key={b.id} className="cursor-pointer hover:bg-surface-2" onClick={() => navigate(`/orcamentos/${b.id}`)}>
                <td className="px-4 py-3">{formatDay(dayOf(b.createdAt))}</td>
                <td className="px-4 py-3">{b.dentist.name}</td>
                <td className="px-4 py-3">{b.itemsCount}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(b.totalCents)}</td>
                <td className="px-4 py-3"><StatusBadge map={BUDGET_STATUS} value={b.status} /></td>
              </tr>
            ))}
          </Table>
        )}
    </Card>
  );
}
