import { useEffect, useState } from 'react';
import { Appointments, Dentists } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { addDays, dayOf, timeOf, toIso } from '../lib/dates.js';
import { useUI } from '../context/UIContext.jsx';
import PatientPicker from './PatientPicker.jsx';
import { Alert, Button, Field, Input, Modal, Select, Textarea } from './ui.jsx';

const CONFLICTS = {
  SLOT_TAKEN: 'Este dentista já tem atendimento nesse horário. Escolha outro horário.',
  PATIENT_BUSY: 'Este paciente já tem atendimento nesse horário (com este ou outro dentista). Escolha outro horário.',
};
const DURATIONS = [15, 20, 30, 40, 45, 60, 90, 120];

/** Novo agendamento ou remarcação. `initial`: { day, time, dentistId, patient } ou o atendimento a editar (`appointment`). */
export default function AppointmentModal({ open, onClose, onSaved, appointment, initial = {} }) {
  const ui = useUI();
  const editing = Boolean(appointment);
  const [dentists, setDentists] = useState([]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    Dentists.list({ active: true }).then(setDentists).catch((err) => ui.error(err));
    if (appointment) {
      const minutes = Math.round((new Date(appointment.endsAt) - new Date(appointment.startsAt)) / 60000);
      setForm({
        patient: appointment.patient, dentistId: appointment.dentist.id, day: dayOf(appointment.startsAt), time: timeOf(appointment.startsAt),
        minutes: DURATIONS.includes(minutes) ? minutes : 30, notes: appointment.notes ?? '',
      });
    } else {
      setForm({ patient: initial.patient ?? null, dentistId: initial.dentistId ?? '', day: initial.day ?? dayOf(), time: initial.time ?? '09:00', minutes: 30, notes: '' });
    }
    setErrors({}); setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment]);

  useEffect(() => {
    if (open && form && !form.dentistId && dentists.length === 1) setForm((f) => ({ ...f, dentistId: dentists[0].id }));
  }, [open, form, dentists]);

  if (!open || !form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const next = {};
    if (!form.patient) next.patientId = 'Escolha o paciente.';
    if (!form.dentistId) next.dentistId = 'Escolha o dentista.';
    if (!form.day) next.day = 'Informe a data.';
    if (!/^\d{2}:\d{2}$/.test(form.time)) next.time = 'Informe o horário.';
    setErrors(next); setFormError(null);
    if (Object.keys(next).length) return;

    const start = toIso(form.day, form.time);
    const unchanged = editing && new Date(start).getTime() === new Date(appointment.startsAt).getTime();
    if (!unchanged && new Date(start).getTime() < Date.now() - 5 * 60000) {
      setErrors({ day: 'Essa data e hora já passaram.' });
      return;
    }
    const end = new Date(new Date(start).getTime() + form.minutes * 60000).toISOString();
    setBusy(true);
    try {
      const body = { dentistId: form.dentistId, startsAt: start, endsAt: end, notes: form.notes.trim() || (editing ? null : undefined) };
      const saved = editing ? await Appointments.update(appointment.id, body) : await Appointments.create({ ...body, patientId: form.patient.id });
      ui.success(editing ? 'Atendimento remarcado.' : 'Atendimento agendado.');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(CONFLICTS[err.code] ?? errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Remarcar atendimento' : 'Novo agendamento'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>{editing ? 'Salvar' : 'Agendar'}</Button></>}>
      <div className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Paciente" required error={errors.patientId}>
          {({ id, invalid }) => (editing ? <Input id={id} value={form.patient.name} disabled /> : <PatientPicker id={id} invalid={invalid} value={form.patient} onChange={(patient) => set({ patient })} />)}
        </Field>
        <Field label="Dentista" required error={errors.dentistId}>
          {({ id, invalid }) => (
            <Select id={id} invalid={invalid} value={form.dentistId} onChange={(e) => set({ dentistId: e.target.value })}>
              <option value="">Selecione…</option>
              {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Data" required error={errors.day} className="col-span-2 sm:col-span-1">{({ id, invalid }) => <Input id={id} type="date" min={editing ? undefined : dayOf()} invalid={invalid} value={form.day} onChange={(e) => set({ day: e.target.value })} />}</Field>
          <Field label="Início" required error={errors.time}>{({ id, invalid }) => <Input id={id} type="time" step={300} invalid={invalid} value={form.time} onChange={(e) => set({ time: e.target.value })} />}</Field>
          <Field label="Duração">
            {({ id }) => <Select id={id} value={form.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>{DURATIONS.map((m) => <option key={m} value={m}>{m} min</option>)}</Select>}
          </Field>
        </div>
        <Field label="Observações" error={errors.notes}>{({ id }) => <Textarea id={id} value={form.notes} maxLength={2000} onChange={(e) => set({ notes: e.target.value })} />}</Field>
        <div className="flex gap-2 text-sm">
          <button type="button" className="text-primary hover:underline" onClick={() => set({ day: dayOf() })}>Hoje</button>
          <span className="text-muted">·</span>
          <button type="button" className="text-primary hover:underline" onClick={() => set({ day: addDays(dayOf(), 1) })}>Amanhã</button>
        </div>
      </div>
    </Modal>
  );
}
