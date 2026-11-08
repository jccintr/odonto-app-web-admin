import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Appointments, Dentists } from '../api/index.js';
import AppointmentDetail from '../components/AppointmentDetail.jsx';
import AppointmentModal from '../components/AppointmentModal.jsx';
import { Button, Card, ErrorState, IconButton, Loading, PageHeader, Select, cx } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { addDays, dayOf, formatDay, formatDayLong, timeOf, toIso, weekStart, weekdayShort } from '../lib/dates.js';
import { APPOINTMENT_STATUS } from '../lib/labels.js';

const HOUR_PX = 64;
const minutesOf = (date) => { const [h, m] = timeOf(date).split(':').map(Number); return h * 60 + m; };

/** Linha do tempo de um dia: uma coluna por dentista. */
function DayGrid({ day, appointments, dentists, onPick, onCreate }) {
  const visible = appointments.filter((a) => a.status !== 'canceled');
  const starts = [8 * 60, ...visible.map((a) => minutesOf(a.startsAt))];
  const ends = [19 * 60, ...visible.map((a) => minutesOf(a.endsAt))];
  const from = Math.floor(Math.min(...starts) / 60);
  const to = Math.min(24, Math.ceil(Math.max(...ends) / 60));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const columns = dentists.length ? dentists : [];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]" style={{ display: 'grid', gridTemplateColumns: `56px repeat(${columns.length}, minmax(150px, 1fr))` }}>
        <div className="sticky left-0 z-10 border-b border-border bg-surface" />
        {columns.map((d) => (
          <div key={d.id} className="flex items-center gap-2 border-b border-l border-border bg-surface px-3 py-2 text-sm font-semibold">
            <span className="size-3 shrink-0 rounded-full" style={{ background: d.color }} /><span className="truncate">{d.name}</span>
          </div>
        ))}
        <div className="sticky left-0 z-10 bg-surface">
          {hours.map((h) => <div key={h} style={{ height: HOUR_PX }} className="border-b border-border pr-2 pt-1 text-right text-xs text-muted">{String(h).padStart(2, '0')}:00</div>)}
        </div>
        {columns.map((d) => (
          <div key={d.id} className="relative border-l border-border" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <button key={h} type="button" aria-label={`Agendar ${d.name} às ${String(h).padStart(2, '0')}:00`} style={{ top: i * HOUR_PX, height: HOUR_PX }}
                className="absolute inset-x-0 border-b border-border/70 hover:bg-primary-soft/40" onClick={() => onCreate({ day, time: `${String(h).padStart(2, '0')}:00`, dentistId: d.id })} />
            ))}
            {visible.filter((a) => a.dentist.id === d.id).map((a) => {
              const top = ((minutesOf(a.startsAt) - from * 60) / 60) * HOUR_PX;
              const height = Math.max(((minutesOf(a.endsAt) - minutesOf(a.startsAt)) / 60) * HOUR_PX, 26);
              return (
                <button key={a.id} type="button" onClick={() => onPick(a)} style={{ top, height, borderLeftColor: d.color }}
                  className={cx('absolute inset-x-1 overflow-hidden rounded-md border border-border border-l-4 bg-surface px-2 py-1 text-left text-xs shadow-sm hover:shadow-md',
                    a.status === 'attended' && 'opacity-60', a.status === 'no_show' && 'opacity-60')}>
                  <span className="font-semibold">{timeOf(a.startsAt)}</span> <span className="font-medium">{a.patient.name}</span>
                  <span className="block text-muted">{APPOINTMENT_STATUS[a.status].label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Semana: uma coluna por dia, com a lista de atendimentos. */
function WeekGrid({ start, appointments, onPick, onDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = dayOf();
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const list = appointments.filter((a) => dayOf(a.startsAt) === day && a.status !== 'canceled').sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          return (
            <div key={day} className="min-h-64">
              <button type="button" onClick={() => onDay(day)} className={cx('w-full border-b border-border px-2 py-2 text-center text-sm hover:bg-surface-2', day === today && 'bg-primary-soft font-semibold text-primary')}>
                <span className="block text-xs uppercase text-muted">{weekdayShort(day)}</span>{formatDay(day).slice(0, 5)}
              </button>
              <ul className="flex flex-col gap-1.5 p-1.5">
                {list.length === 0 && <li className="px-1 py-2 text-center text-xs text-muted">—</li>}
                {list.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onPick(a)} style={{ borderLeftColor: a.dentist.color }} className="w-full rounded-md border border-border border-l-4 bg-surface px-2 py-1 text-left text-xs hover:shadow-md">
                      <span className="font-semibold">{timeOf(a.startsAt)}</span> {a.patient.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const day = params.get('dia') ?? dayOf();
  const view = params.get('visao') === 'semana' ? 'semana' : 'dia';
  const dentistFilter = params.get('dentista') ?? '';
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null); // { appointment? , initial? }

  // "Agendar" na lista de trabalho chega aqui com o paciente escolhido: abre o novo agendamento já com ele
  useEffect(() => {
    const id = params.get('agendar');
    if (!id) return;
    setForm({ initial: { day, dentistId: dentistFilter, patient: { id, name: params.get('nome') ?? '' } } });
    const next = new URLSearchParams(params);
    next.delete('agendar'); next.delete('nome');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const start = weekStart(day);
  const range = view === 'semana' ? [start, addDays(start, 6)] : [day, day];
  const dentists = useResource(() => Dentists.list({ active: true }), []);
  const list = useResource(
    () => Appointments.list({ from: toIso(range[0], '00:00'), to: toIso(range[1], '23:59'), dentistId: dentistFilter || undefined, perPage: 200 }),
    [range[0], range[1], dentistFilter],
  );

  const columns = useMemo(() => (dentists.data ?? []).filter((d) => !dentistFilter || d.id === dentistFilter), [dentists.data, dentistFilter]);
  const shift = (n) => go({ dia: addDays(day, view === 'semana' ? n * 7 : n) });
  const title = view === 'semana' ? `${formatDay(range[0])} a ${formatDay(range[1])}` : formatDayLong(day);
  const reload = () => list.reload();

  return (
    <>
      <PageHeader title="Agenda" actions={<Button icon="plus" onClick={() => setForm({ initial: { day, dentistId: dentistFilter } })}>Novo agendamento</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <IconButton icon="chevronLeft" label="Anterior" onClick={() => shift(-1)} />
          <Button variant="secondary" size="sm" onClick={() => go({ dia: null })}>Hoje</Button>
          <IconButton icon="chevronRight" label="Próximo" onClick={() => shift(1)} />
          <h2 className="mx-2 min-w-0 flex-1 truncate text-base font-semibold capitalize">{title}</h2>
          <input aria-label="Ir para a data" type="date" value={day} onChange={(e) => e.target.value && go({ dia: e.target.value })} className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm" />
          <Select aria-label="Dentista" className="h-9 w-auto" value={dentistFilter} onChange={(e) => go({ dentista: e.target.value })}>
            <option value="">Todos os dentistas</option>
            {(dentists.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {[['dia', 'Dia'], ['semana', 'Semana']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={view === id} onClick={() => go({ visao: id === 'dia' ? null : id })}
                className={cx('rounded-md px-3 py-1', view === id ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text')}>{label}</button>
            ))}
          </div>
        </div>
        {(list.loading || dentists.loading) && !list.data ? <Loading />
          : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={reload} /></div>
            : view === 'semana'
              ? <WeekGrid start={start} appointments={list.data.data} onPick={setSelected} onDay={(d) => go({ dia: d, visao: null })} />
              : columns.length === 0
                ? <p className="p-8 text-center text-muted">Nenhum dentista cadastrado. Cadastre em Equipe.</p>
                : <DayGrid day={day} appointments={list.data.data} dentists={columns} onPick={setSelected} onCreate={(initial) => setForm({ initial })} />}
      </Card>

      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)}
        onChanged={(updated) => { setSelected(updated); reload(); }}
        onReschedule={(a) => { setSelected(null); setForm({ appointment: a }); }} />
      <AppointmentModal open={Boolean(form)} appointment={form?.appointment} initial={form?.initial} onClose={() => setForm(null)} onSaved={reload} />
    </>
  );
}
