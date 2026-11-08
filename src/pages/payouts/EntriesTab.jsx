import { useState } from 'react';
import { Dentists, Payouts } from '../../api/index.js';
import { Card, CardHeader, EmptyState, ErrorState, Input, Loading, Pagination, Select, Table, cx } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { RULE_SOURCE } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';
import { formatPercent } from '../../lib/percent.js';

const ruleText = (rule) => `${RULE_SOURCE[rule.source]}: ${rule.type === 'percent' ? formatPercent(rule.percent) : `${formatMoney(rule.fixedCents)} fixo`}`;

export default function EntriesTab() {
  const [dentistId, setDentistId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const dentists = useResource(() => Dentists.list(), []);
  const list = useResource(() => Payouts.entries({ dentistId: dentistId || undefined, from: from || undefined, to: to || undefined, page, perPage: 20 }), [dentistId, from, to, page]);

  return (
    <Card>
      <CardHeader title="Lançamentos de repasse" subtitle="Um por procedimento realizado. A regra e a comissão ficam congeladas na hora da execução." />
      <div className="flex flex-wrap items-end gap-3 border-b border-border p-3">
        <Select aria-label="Dentista" className="w-auto" value={dentistId} onChange={(e) => { setDentistId(e.target.value); setPage(1); }}><option value="">Todos os dentistas</option>{(dentists.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted">Realizado de</span><Input type="date" className="h-9" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted">até</span><Input type="date" className="h-9" max={dayOf()} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : list.data.data.length === 0 ? <EmptyState icon="coin" title="Nenhum lançamento">Nada encontrado neste período.</EmptyState> : (
          <>
            <Table head={['Realizado', 'Procedimento', 'Dentista', 'Regra aplicada', { label: 'Base', right: true }, { label: 'Comissão', right: true }, { label: 'Liberado', right: true }, { label: 'Pago', right: true }, { label: 'Saldo', right: true }]}>
              {list.data.data.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatDay(dayOf(e.performedAt))}</td>
                  <td className="px-4 py-3"><span className="font-medium">{e.item.procedure.name}</span>{e.item.tooth ? ` — dente ${e.item.tooth}` : ''}<span className="block text-xs text-muted">{e.patient.name}</span></td>
                  <td className="px-4 py-3">{e.dentist.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">{ruleText(e.rule)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.baseCents)}{e.costCents > 0 && <span className="block text-xs text-muted">custo {formatMoney(e.costCents)}</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.commissionCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.releasedCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.paidCents)}</td>
                  <td className={cx('px-4 py-3 text-right font-semibold tabular-nums', e.balanceCents < 0 && 'text-danger')}>{formatMoney(e.balanceCents)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
          </>
        )}
    </Card>
  );
}
