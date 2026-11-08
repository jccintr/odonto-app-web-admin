import { beforeEach, describe, expect, it } from 'vitest';
import { api, loginAs, renderApp, screen, seedBudget, unique, user, within } from './helpers.jsx';

// o cenário é montado como administrador; a tela é vista pela secretária
beforeEach(async () => { await loginAs('admin'); });
const asSecretary = () => loginAs('secretary');

const rowOf = async (section, name) => within((await screen.findByText(section)).closest('section')).getByText(name).closest('li');

describe('painel: para resolver', () => {
  it('procedimento aprovado sem consulta: aparece e o botão Agendar abre o agendamento com o paciente', async () => {
    const u = user();
    const { patient } = await seedBudget();
    await asSecretary();
    renderApp('/');
    const row = await rowOf('Aprovados, falta agendar', patient.name);
    expect(row).toHaveTextContent('1 procedimento aprovado');
    await u.click(within(row).getByRole('button', { name: 'Agendar' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Novo agendamento')).toBeInTheDocument();
    expect(within(dialog).getByText(patient.name)).toBeInTheDocument();
  });

  it('orçamento em aberto aparece em "sem resposta" e leva ao orçamento', async () => {
    const u = user();
    const patient = await api('/api/patients', { method: 'POST', body: { name: unique('Pendente'), contactConsent: false } });
    const dentists = await api('/api/dentists');
    const procedures = await api('/api/procedures?perPage=100');
    await api('/api/budgets', { method: 'POST', body: { patientId: patient.id, dentistId: dentists[0].id, items: [{ procedureId: procedures.data[0].id }] } });
    await asSecretary();
    renderApp('/');
    const row = await rowOf('Orçamentos sem resposta', patient.name);
    expect(row).toHaveTextContent('criado hoje');
    await u.click(within(row).getByRole('link', { name: 'Abrir' }));
    expect(await screen.findByRole('link', { name: '← Orçamentos' })).toBeInTheDocument();
  });

  it('paciente em atraso com consulta marcada aparece como bloqueado', async () => {
    const { patient, dentist, budget } = await seedBudget();
    const start = new Date(Date.UTC(2095, 5, 10, 14, 0));
    await api('/api/appointments', { method: 'POST', body: { patientId: patient.id, dentistId: dentist.id, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString() } });
    await api(`/api/budgets/${budget.id}/payments`, { method: 'POST', body: { amountCents: 5000, dueDate: '2020-01-10' } });
    await asSecretary();
    renderApp('/');
    const row = await rowOf('Em atraso, com consulta marcada', patient.name);
    expect(row).toHaveTextContent('Deve R$ 50,00');
    expect(row).toHaveTextContent('Bloqueado');
    // o procedimento aprovado já tem consulta marcada, então não está mais na lista de agendar
    expect(within((await screen.findByText('Aprovados, falta agendar')).closest('section')).queryByText(patient.name)).not.toBeInTheDocument();
  });
});
