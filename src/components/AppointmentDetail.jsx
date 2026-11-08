import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Appointments, Notices } from '../api/index.js';
import { useUI } from '../context/UIContext.jsx';
import { formatDay, dayOf, timeOf } from '../lib/dates.js';
import { APPOINTMENT_STATUS } from '../lib/labels.js';
import { Button, Modal, StatusBadge } from './ui.jsx';

/** Detalhe do atendimento com as ações do dia a dia: situação, remarcar, lembrete por e-mail e WhatsApp. */
export default function AppointmentDetail({ appointment, onClose, onChanged, onReschedule }) {
  const ui = useUI();
  const [busy, setBusy] = useState(null);
  if (!appointment) return null;
  const a = appointment;
  const active = ['scheduled', 'confirmed'].includes(a.status);
  const upcoming = active && new Date(a.startsAt) > new Date();

  const run = async (key, fn, okMessage) => {
    setBusy(key);
    try { const result = await fn(); if (okMessage) ui.success(okMessage); return result; } catch (err) { ui.error(err); return null; } finally { setBusy(null); }
  };

  const setStatus = async (status, label, danger) => {
    let reason;
    if (status === 'canceled' || status === 'no_show') {
      const answer = await ui.confirm({ title: label, message: `${a.patient.name} — ${formatDay(dayOf(a.startsAt))} às ${timeOf(a.startsAt)}.`, confirmLabel: label, danger, askReason: status === 'canceled' });
      if (!answer) return;
      if (typeof answer === 'string') reason = answer;
    }
    const updated = await run(status, () => Appointments.setStatus(a.id, status, reason), 'Situação atualizada.');
    if (updated) { onChanged?.(updated); }
  };

  const reminder = async () => {
    const notice = await run('reminder', () => Notices.reminder(a.id));
    if (!notice) return;
    if (notice.status === 'sent') ui.success(`Lembrete enviado para ${notice.recipient}.`);
    else ui.error(`Não foi possível enviar o e-mail: ${notice.lastError}`);
  };

  const whatsapp = async () => {
    const link = await run('whatsapp', () => Notices.appointmentWhatsapp(a.id));
    if (link) window.open(link.url, '_blank', 'noopener');
  };

  return (
    <Modal open onClose={onClose} title="Atendimento"
      footer={(
        <>
          {upcoming && <Button variant="secondary" icon="mail" loading={busy === 'reminder'} onClick={reminder}>Lembrete por e-mail</Button>}
          {upcoming && <Button variant="secondary" icon="whatsapp" loading={busy === 'whatsapp'} onClick={whatsapp}>WhatsApp</Button>}
          {active && <Button variant="secondary" icon="edit" onClick={() => onReschedule(a)}>Remarcar</Button>}
        </>
      )}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to={`/pacientes/${a.patient.id}`} className="text-lg font-semibold text-primary hover:underline" onClick={onClose}>{a.patient.name}</Link>
            {a.patient.phone && <p className="text-sm text-muted">{a.patient.phone}</p>}
          </div>
          <StatusBadge map={APPOINTMENT_STATUS} value={a.status} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">Data</dt><dd className="font-medium">{formatDay(dayOf(a.startsAt))}</dd></div>
          <div><dt className="text-muted">Horário</dt><dd className="font-medium">{timeOf(a.startsAt)} – {timeOf(a.endsAt)}</dd></div>
          <div className="col-span-2"><dt className="text-muted">Dentista</dt><dd className="flex items-center gap-2 font-medium"><span className="size-3 rounded-full" style={{ background: a.dentist.color }} />{a.dentist.name}</dd></div>
          {a.notes && <div className="col-span-2"><dt className="text-muted">Observações</dt><dd className="whitespace-pre-wrap">{a.notes}</dd></div>}
          {a.canceledReason && <div className="col-span-2"><dt className="text-muted">Motivo do cancelamento</dt><dd>{a.canceledReason}</dd></div>}
        </dl>
        {active && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {a.status === 'scheduled' && <Button size="sm" variant="soft" icon="check" loading={busy === 'confirmed'} onClick={() => setStatus('confirmed', 'Confirmar')}>Confirmar</Button>}
            <Button size="sm" variant="secondary" loading={busy === 'no_show'} onClick={() => setStatus('no_show', 'Registrar falta', true)}>Faltou</Button>
            <Button size="sm" variant="secondary" className="text-danger" loading={busy === 'canceled'} onClick={() => setStatus('canceled', 'Cancelar atendimento', true)}>Cancelar</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
