import { Link, useNavigate } from 'react-router-dom';
import { Worklist } from '../api/index.js';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from './ui.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay, formatDateTime } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

function Section({ title, count, children }) {
  if (count === 0) return null;
  return (
    <section className="border-t border-border first:border-t-0">
      <h3 className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold sm:px-5">{title}<Badge tone="primary">{count}</Badge></h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

const Row = ({ children, action }) => <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"><div className="min-w-0 flex-1">{children}</div>{action}</li>;

/** O que a recepção precisa resolver: agendar o que foi aprovado, cobrar resposta de orçamento e avisar quem está em atraso. */
export default function WorklistCard() {
  const navigate = useNavigate();
  const work = useResource(() => Worklist.get(), []);
  const schedule = (patient) => navigate(`/agenda?agendar=${patient.id}&nome=${encodeURIComponent(patient.name)}`);

  if (work.loading && !work.data) return <Card className="mb-6"><div role="status" aria-label="Carregando" className="space-y-3 p-4 sm:p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-10" />)}</div></Card>;
  if (work.error) return <Card className="mb-6"><div className="p-4"><ErrorState error={work.error} onRetry={work.reload} /></div></Card>;

  const { approvedWithoutAppointment: toSchedule, budgetsAwaitingAnswer: waiting, overdueWithAppointments: late } = work.data;
  const total = toSchedule.length + waiting.length + late.length;
  return (
    <Card className="mb-6">
      <CardHeader title="Para resolver" subtitle="Pendências da recepção" />
      {total === 0 ? <EmptyState icon="check" title="Nada pendente">Procedimentos aprovados sem consulta, orçamentos sem resposta e pacientes em atraso aparecem aqui.</EmptyState> : (
        <>
          <Section title="Aprovados, falta agendar" count={toSchedule.length}>
            {toSchedule.map((row) => (
              <Row key={row.patient.id} action={<Button size="sm" variant="soft" onClick={() => schedule(row.patient)}>Agendar</Button>}>
                <Link to={`/pacientes/${row.patient.id}`} className="font-medium hover:underline">{row.patient.name}</Link>
                <span className="block text-sm text-muted">{row.itemsCount} {row.itemsCount === 1 ? 'procedimento aprovado' : 'procedimentos aprovados'} desde {formatDay(dayOf(row.approvedSince))}</span>
              </Row>
            ))}
          </Section>
          <Section title="Orçamentos sem resposta" count={waiting.length}>
            {waiting.map((row) => (
              <Row key={row.budgetId} action={<Link to={`/orcamentos/${row.budgetId}`} className="text-sm font-medium text-primary hover:underline">Abrir</Link>}>
                <span className="font-medium">{row.patient.name}</span>
                <span className="block text-sm text-muted">{formatMoney(row.totalCents)} · {row.dentistName} · {row.daysOpen === 0 ? 'criado hoje' : `há ${row.daysOpen} ${row.daysOpen === 1 ? 'dia' : 'dias'}`}</span>
              </Row>
            ))}
          </Section>
          <Section title="Em atraso, com consulta marcada" count={late.length}>
            {late.map((row) => (
              <Row key={row.patient.id} action={<Link to={`/pacientes/${row.patient.id}`} className="text-sm font-medium text-primary hover:underline">Ver ficha</Link>}>
                <span className="font-medium">{row.patient.name}</span>
                <span className="block text-sm text-muted">
                  Deve {formatMoney(row.overdueCents)} (desde {formatDay(row.oldestDueDate)}) · consulta {formatDateTime(row.nextAppointment.startsAt)} com {row.nextAppointment.dentistName}
                  {' '}<Badge tone={row.blocked ? 'danger' : 'warning'}>{row.blocked ? 'Bloqueado' : 'Liberado'}</Badge>
                </span>
              </Row>
            ))}
          </Section>
        </>
      )}
    </Card>
  );
}
