import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Budgets } from '../api/index.js';
import BudgetForm from '../components/BudgetForm.jsx';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, Select, StatusBadge, Table } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { BUDGET_STATUS } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

export default function BudgetsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('situacao') ?? '';
  const page = Number(params.get('pagina') ?? 1);
  const [creating, setCreating] = useState(false);
  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const list = useResource(() => Budgets.list({ status: status || undefined, page, perPage: 20 }), [status, page]);

  return (
    <>
      <PageHeader title="Orçamentos" actions={<Button icon="plus" onClick={() => setCreating(true)}>Novo orçamento</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Select aria-label="Situação" className="w-auto" value={status} onChange={(e) => go({ situacao: e.target.value, pagina: null })}>
            <option value="">Todas as situações</option>
            {Object.entries(BUDGET_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </Select>
        </div>
        {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
          : list.data.data.length === 0 ? (
            <EmptyState icon="clipboard" title="Nenhum orçamento" action={<Button icon="plus" onClick={() => setCreating(true)}>Criar orçamento</Button>}>
              {status ? 'Não há orçamentos nesta situação.' : 'Crie o primeiro orçamento para um paciente.'}
            </EmptyState>
          ) : (
            <>
              <Table head={['Data', 'Paciente', 'Dentista', 'Itens', { label: 'Total', right: true }, 'Situação']}>
                {list.data.data.map((b) => (
                  <tr key={b.id} className="cursor-pointer hover:bg-surface-2" onClick={() => navigate(`/orcamentos/${b.id}`)}>
                    <td className="px-4 py-3 text-muted">{formatDay(dayOf(b.createdAt))}</td>
                    <td className="px-4 py-3 font-medium">{b.patient.name}</td>
                    <td className="px-4 py-3">{b.dentist.name}</td>
                    <td className="px-4 py-3">{b.itemsCount}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(b.totalCents)}</td>
                    <td className="px-4 py-3"><StatusBadge map={BUDGET_STATUS} value={b.status} /></td>
                  </tr>
                ))}
              </Table>
              <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={(n) => go({ pagina: n > 1 ? String(n) : null })} />
            </>
          )}
      </Card>
      <BudgetForm open={creating} onClose={() => setCreating(false)} onSaved={(b) => navigate(`/orcamentos/${b.id}`)} />
    </>
  );
}
