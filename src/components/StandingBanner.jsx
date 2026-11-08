import { useState } from 'react';
import { Patients } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';
import { Alert, Button, Field, Input, Modal, Select } from './ui.jsx';

const DAYS = [1, 2, 3, 7, 15, 30];

function ReleaseModal({ patientId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    if (reason.trim().length < 3) { setError('Informe o motivo da liberação.'); return; }
    setBusy(true); setError(null);
    try { onDone(await Patients.releaseBlock(patientId, { reason: reason.trim(), days: Number(days) })); onClose(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Liberar paciente bloqueado"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Liberar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-sm text-muted">É uma exceção (urgência, dor). Ela vale por alguns dias, fica registrada com o seu nome e não regulariza a dívida.</p>
        <Field label="Motivo" required>{({ id }) => <Input id={id} maxLength={240} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
        <Field label="Vale por">{({ id }) => <Select id={id} value={days} onChange={(e) => setDays(e.target.value)}>{DAYS.map((d) => <option key={d} value={d}>{d === 1 ? '1 dia' : `${d} dias`}</option>)}</Select>}</Field>
      </div>
    </Modal>
  );
}

/** Aviso na ficha do paciente com pagamento em atraso: bloqueado (só o administrador libera) ou liberado por exceção. */
export default function StandingBanner({ standing, patientId, isAdmin, onChanged }) {
  const [releasing, setReleasing] = useState(false);
  if (!standing?.overdue) return null;
  const late = `${formatMoney(standing.overdueCents)} em atraso desde ${formatDay(standing.oldestDueDate)}`;
  return (
    <>
      {standing.blocked ? (
        <Alert tone="danger" className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <span><strong>Paciente bloqueado:</strong> {late} (tolerância de {standing.graceDays} dia(s)). Novos agendamentos e o início dos atendimentos marcados estão suspensos até regularizar o pagamento.</span>
          {isAdmin && <Button size="sm" variant="secondary" onClick={() => setReleasing(true)}>Liberar (exceção)</Button>}
        </Alert>
      ) : (
        <Alert tone="warning" className="no-print mb-4">
          <strong>Liberado por exceção</strong> até {formatDay(dayOf(standing.releasedUntil))}: {standing.releaseReason}. A pendência continua: {late}.
        </Alert>
      )}
      {releasing && <ReleaseModal patientId={patientId} onClose={() => setReleasing(false)} onDone={onChanged} />}
    </>
  );
}
