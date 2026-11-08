import { describe, expect, it } from 'vitest';
import { api, loginAs, renderApp, screen, unique, waitFor } from './helpers.jsx';

const tomorrowAt = (time) => {
  const d = new Date(Date.now() + 86_400_000);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
  return `${day}T${time}:00-03:00`;
};

describe('prontuário na ficha do paciente', () => {
  it('a administração lê o que o dentista registrou (com a retificação); a secretária nem vê a aba', async () => {
    // o dentista atende e registra
    await loginAs('secretary');
    const patient = await api('/api/patients', { method: 'POST', body: { name: unique('Paciente Prontuário'), contactConsent: false } });
    const dentist = (await api('/api/dentists'))[0];
    const procedure = (await api('/api/procedures?perPage=100')).data.find((p) => p.name === 'Restauração em resina');
    const appointment = await api('/api/appointments', { method: 'POST', body: { patientId: patient.id, dentistId: dentist.id, startsAt: tomorrowAt('22:00'), endsAt: tomorrowAt('22:30') } });
    await loginAs('dentist');
    await api(`/api/appointments/${appointment.id}/status`, { method: 'POST', body: { status: 'in_progress' } });
    await api(`/api/appointments/${appointment.id}/status`, { method: 'POST', body: { status: 'attended', evolution: { description: 'Restauração no 16, sem intercorrências.', procedures: [{ procedureId: procedure.id, teeth: [16] }, { procedureId: procedure.id, wholeMouth: true }] } } });
    const [evolution] = (await api(`/api/patients/${patient.id}/evolutions`)).data;
    await api(`/api/patients/${patient.id}/evolutions/${evolution.id}/addendum`, { method: 'POST', body: { description: 'Faltou citar o uso de anestesia local.' } });

    // a administração lê
    await loginAs('admin');
    renderApp(`/pacientes/${patient.id}?aba=prontuario`);
    expect(await screen.findByText('Restauração no 16, sem intercorrências.')).toBeInTheDocument();
    expect(screen.getByText(/Restauração em resina · dente 16/)).toBeInTheDocument();
    expect(screen.getByText(/Restauração em resina · boca toda/)).toBeInTheDocument();
    expect(screen.getByText('Faltou citar o uso de anestesia local.')).toBeInTheDocument();
    expect(screen.getByText('Retificação')).toBeInTheDocument();

    // sem registros: mensagem de vazio
    const empty = await api('/api/patients', { method: 'POST', body: { name: unique('Paciente Sem Registro'), contactConsent: false } });
    renderApp(`/pacientes/${empty.id}?aba=prontuario`);
    expect(await screen.findByText('Nenhum registro')).toBeInTheDocument();

    // a secretária não tem a aba (e cair nela pela URL mostra os dados)
    await loginAs('secretary');
    renderApp(`/pacientes/${patient.id}?aba=prontuario`);
    await screen.findByRole('tab', { name: 'Dados' });
    expect(screen.queryByRole('tab', { name: 'Prontuário' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Restauração no 16, sem intercorrências.')).not.toBeInTheDocument());
  });
});
