import { useState } from 'react';
import { Evolutions } from '../../api/index.js';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Loading, Pagination } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import { formatDateTime } from '../../lib/dates.js';

/** Prontuário (somente leitura): o que foi feito em cada atendimento, registrado pelo dentista. */
export default function EvolutionsTab({ patient }) {
  const [page, setPage] = useState(1);
  const list = useResource(() => Evolutions.list(patient.id, { page, perPage: 10 }), [patient.id, page]);

  return (
    <Card>
      <CardHeader title="Prontuário" />
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : list.data.data.length === 0 ? <EmptyState icon="clipboard" title="Nenhum registro">O dentista registra o que foi feito ao concluir cada atendimento, e aparece aqui.</EmptyState> : (
          <>
            <ul className="divide-y divide-border">
              {list.data.data.map((e) => (
                <li key={e.id} className="flex flex-col gap-2 p-4">
                  <p className="text-sm"><span className="font-semibold">{formatDateTime(e.appointmentStartsAt)}</span> <span className="text-muted">· {e.dentist.name}</span></p>
                  {e.description && <p className="whitespace-pre-wrap text-sm">{e.description}</p>}
                  {e.procedures.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {e.procedures.map((p) => <Badge key={`${p.procedure.id}-${p.tooth ?? 'boca'}-${p.budgetItemId}`} tone="primary">{p.procedure.name} · {p.wholeMouth ? 'boca toda' : `dente ${p.tooth}`}</Badge>)}
                    </div>
                  )}
                  {e.addenda.map((a) => (
                    <p key={a.id} className="rounded-lg bg-surface-2 p-3 text-sm"><span className="font-semibold">Retificação</span> <span className="text-muted">em {formatDateTime(a.createdAt)} · {a.dentist.name}</span><br /><span className="whitespace-pre-wrap">{a.description}</span></p>
                  ))}
                </li>
              ))}
            </ul>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
          </>
        )}
    </Card>
  );
}
