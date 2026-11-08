import { Link } from 'react-router-dom';
import { Appointments, Budgets, Payments } from '../api/index.js';
import AppointmentDetail from '../components/AppointmentDetail.jsx';
import OnboardingCard from '../components/OnboardingCard.jsx';
import WorklistCard from '../components/WorklistCard.jsx';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Stat, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useResource from '../hooks/useResource.js';
import { addDays, dayOf, formatDayLong, timeOf, toIso } from '../lib/dates.js';
import { APPOINTMENT_STATUS } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';
import { useState } from 'react';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const today = dayOf();
  const [selected, setSelected] = useState(null);

  const agenda = useResource(() => Appointments.list({ from: toIso(today, '00:00'), to: toIso(addDays(today, 1), '23:59'), perPage: 200 }), [today]);
  const overdue = useResource(() => Payments.list({ overdue: true, perPage: 100 }), []);
  const open = useResource(() => Budgets.list({ status: 'open', perPage: 1 }), []);

  const todays = (agenda.data?.data ?? []).filter((a) => dayOf(a.startsAt) === today).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const tomorrowCount = (agenda.data?.data ?? []).filter((a) => dayOf(a.startsAt) === addDays(today, 1) && a.status !== 'canceled').length;
  const active = todays.filter((a) => a.status !== 'canceled');
  const overdueSum = (overdue.data?.data ?? []).reduce((total, p) => total + p.amountCents, 0);
  const first = user.name.split(' ')[0];

  return (
    <>
      <PageHeader title={`Olá, ${first}!`} subtitle={<span className="capitalize">{formatDayLong(today)}</span>} />
      {isAdmin && <OnboardingCard />}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="calendar" label="Atendimentos hoje" value={agenda.data ? active.length : '…'} hint={agenda.data ? `${active.filter((a) => a.status === 'attended').length} já atendidos` : undefined} />
        <Stat icon="clock" label="Amanhã" value={agenda.data ? tomorrowCount : '…'} hint="atendimentos agendados" />
        <Stat icon="wallet" label="Pagamentos vencidos" value={overdue.data ? formatMoney(overdueSum) : '…'} tone={overdueSum > 0 ? 'danger' : undefined}
          hint={overdue.data ? `${overdue.data.total} ${overdue.data.total === 1 ? 'parcela' : 'parcelas'}` : undefined} />
        <Stat icon="clipboard" label="Orçamentos em aberto" value={open.data ? open.data.total : '…'} hint="aguardando decisão do paciente" />
      </div>

      {user.role !== 'dentist' && <WorklistCard />}

      <Card>
        <CardHeader title="Agenda de hoje" action={<Link to="/agenda" className="text-sm font-medium text-primary hover:underline">Ver agenda</Link>} />
        {agenda.loading && !agenda.data ? <div role="status" aria-label="Carregando" className="space-y-3 p-4 sm:p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div> : agenda.error ? <div className="p-4"><ErrorState error={agenda.error} onRetry={agenda.reload} /></div>
          : todays.length === 0 ? <EmptyState icon="calendar" title="Nenhum atendimento hoje">Quando houver consultas agendadas para hoje, elas aparecem aqui.</EmptyState> : (
            <ul className="divide-y divide-border">
              {todays.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2 sm:px-5">
                    <span className="w-14 shrink-0 text-lg font-semibold tabular-nums">{timeOf(a.startsAt)}</span>
                    <span className="size-3 shrink-0 rounded-full" style={{ background: a.dentist.color }} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{a.patient.name}</span><span className="block truncate text-sm text-muted">{a.dentist.name}</span></span>
                    <StatusBadge map={APPOINTMENT_STATUS} value={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
      {isAdmin && <p className="mt-4 text-sm text-muted">Veja o resumo do mês em <Link to="/relatorios" className="text-primary hover:underline">Relatórios</Link>.</p>}
      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onChanged={(u) => { setSelected(u); agenda.reload(); }} onReschedule={() => { setSelected(null); window.location.assign('/agenda'); }} />
    </>
  );
}
