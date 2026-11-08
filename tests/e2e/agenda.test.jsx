import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, dayOf } from '../../src/lib/dates.js';
import { loginAs, renderApp, screen, user, waitFor, within } from './helpers.jsx';

beforeEach(async () => { await loginAs('secretary'); });

describe('agenda', () => {
  it('agenda uma consulta, não deixa dois atendimentos no mesmo horário e permite remarcar e cancelar', async () => {
    const u = user();
    const day = addDays(dayOf(), 30);
    renderApp(`/agenda?dia=${day}`);
    await u.click(await screen.findByRole('button', { name: 'Novo agendamento' }));
    let dialog = await screen.findByRole('dialog');

    // paciente por busca
    await u.type(within(dialog).getByPlaceholderText(/Digite nome/), 'ana');
    await u.click(await within(dialog).findByRole('option', { name: /Ana Lima/ }));
    await u.selectOptions(within(dialog).getByLabelText(/Dentista/), within(dialog).getByRole('option', { name: 'Dr. Paulo Lima' }));
    await u.clear(within(dialog).getByLabelText(/Início/));
    await u.type(within(dialog).getByLabelText(/Início/), '10:00');
    await u.click(within(dialog).getByRole('button', { name: 'Agendar' }));

    // aparece na grade
    const block = await screen.findByRole('button', { name: /10:00 Ana Lima/ });
    expect(block).toBeInTheDocument();

    // mesmo dentista, mesmo horário: recusado
    await u.click(screen.getByRole('button', { name: 'Novo agendamento' }));
    dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByPlaceholderText(/Digite nome/), 'carlos');
    await u.click(await within(dialog).findByRole('option', { name: /Carlos Souza/ }));
    await u.selectOptions(within(dialog).getByLabelText(/Dentista/), within(dialog).getByRole('option', { name: 'Dr. Paulo Lima' }));
    await u.clear(within(dialog).getByLabelText(/Início/));
    await u.type(within(dialog).getByLabelText(/Início/), '10:15');
    await u.click(within(dialog).getByRole('button', { name: 'Agendar' }));
    expect(await within(dialog).findByText(/já tem atendimento nesse horário/)).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    // mesmo paciente, outro dentista, mesmo horário: recusado (o paciente não está em dois lugares)
    await u.click(screen.getByRole('button', { name: 'Novo agendamento' }));
    dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByPlaceholderText(/Digite nome/), 'ana');
    await u.click(await within(dialog).findByRole('option', { name: /Ana Lima/ }));
    await u.selectOptions(within(dialog).getByLabelText(/Dentista/), within(dialog).getByRole('option', { name: 'Dra. Bia Costa' }));
    await u.clear(within(dialog).getByLabelText(/Início/));
    await u.type(within(dialog).getByLabelText(/Início/), '10:15');
    await u.click(within(dialog).getByRole('button', { name: 'Agendar' }));
    expect(await within(dialog).findByText(/Este paciente já tem atendimento nesse horário/)).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    // detalhe → confirmar → cancelar com motivo
    await u.click(block);
    dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dialog).findByText('Confirmado')).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    const confirm = (await screen.findAllByRole('dialog')).at(-1);
    await u.type(within(confirm).getByLabelText(/Motivo/), 'Paciente avisou');
    await u.click(within(confirm).getByRole('button', { name: 'Cancelar atendimento' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /10:00 Ana Lima/ })).not.toBeInTheDocument(), { timeout: 5000 });
  });

  it('mostra o atendimento de hoje no painel', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Olá, Maria/ })).toBeInTheDocument();
    expect(await screen.findByText('Atendimentos hoje')).toBeInTheDocument();
    expect(screen.getByText('Orçamentos em aberto')).toBeInTheDocument();
  });

  it('não deixa agendar em data que já passou: avisa na tela e nada é criado', async () => {
    const u = user();
    const yesterday = addDays(dayOf(), -1);
    renderApp(`/agenda?dia=${yesterday}`);
    await u.click(await screen.findByRole('button', { name: 'Novo agendamento' }));
    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByPlaceholderText(/Digite nome/), 'ana');
    await u.click(await within(dialog).findByRole('option', { name: /Ana Lima/ }));
    await u.selectOptions(within(dialog).getByLabelText(/Dentista/), within(dialog).getByRole('option', { name: 'Dr. Paulo Lima' }));
    await u.clear(within(dialog).getByLabelText(/Início/));
    await u.type(within(dialog).getByLabelText(/Início/), '10:00');
    await u.click(within(dialog).getByRole('button', { name: 'Agendar' }));
    expect(await within(dialog).findByText('Essa data e hora já passaram.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /10:00 Ana Lima/ })).not.toBeInTheDocument();
  });
});
