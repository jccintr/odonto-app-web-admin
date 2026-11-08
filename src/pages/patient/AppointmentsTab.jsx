import { useState } from 'react';
import { Appointments } from '../../api/index.js';
import AppointmentDetail from '../../components/AppointmentDetail.jsx';
import AppointmentModal from '../../components/AppointmentModal.jsx';
import { Button, Card, CardHeader, EmptyState, ErrorState, Loading, StatusBadge, Table } from '../../components/ui.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay, timeOf } from '../../lib/dates.js';
import { APPOINTMENT_STATUS } from '../../lib/labels.js';

export default function AppointmentsTab({ patient }) {
  const list = useResource(() => Appointments.list({ patientId: patient.id, perPage: 100 }), [patient.id]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);

  const rows = [...(list.data?.data ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return (
    <Card>
      <CardHeader title="Atendimentos" action={<Button size="sm" icon="plus" onClick={() => setForm({ initial: { patient: { id: patient.id, name: patient.name } } })}>Agendar</Button>} />
      {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
        : rows.length === 0 ? <EmptyState icon="calendar" title="Nenhum atendimento">Este paciente ainda não tem consultas agendadas.</EmptyState> : (
          <Table head={['Data', 'Horário', 'Dentista', 'Situação']}>
            {rows.map((a) => (
              <tr key={a.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setSelected(a)}>
                <td className="px-4 py-3 font-medium">{formatDay(dayOf(a.startsAt))}</td>
                <td className="px-4 py-3">{timeOf(a.startsAt)} – {timeOf(a.endsAt)}</td>
                <td className="px-4 py-3">{a.dentist.name}</td>
                <td className="px-4 py-3"><StatusBadge map={APPOINTMENT_STATUS} value={a.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onChanged={(u) => { setSelected(u); list.reload(); }} onReschedule={(a) => { setSelected(null); setForm({ appointment: a }); }} />
      <AppointmentModal open={Boolean(form)} appointment={form?.appointment} initial={form?.initial} onClose={() => setForm(null)} onSaved={list.reload} />
    </Card>
  );
}
