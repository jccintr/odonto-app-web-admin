import { beforeEach, describe, expect, it } from 'vitest';
import { api, loginAs, renderApp, screen, seedBudget, unique, user, waitFor, within } from './helpers.jsx';

beforeEach(async () => { await loginAs('secretary'); });

describe('pacientes', () => {
  it('lista os pacientes cadastrados e busca por nome', async () => {
    const u = user();
    renderApp('/pacientes');
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Buscar paciente'), 'carlos');
    await waitFor(() => expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument());
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
  });

  it('cadastra um paciente, abre a ficha e edita a anamnese', async () => {
    const u = user();
    const name = unique('Paciente Teste');
    renderApp('/pacientes');
    await u.click(await screen.findByRole('button', { name: 'Novo paciente' }));
    const dialog = await screen.findByRole('dialog');

    // validação no navegador, antes de ir à API
    await u.type(within(dialog).getByLabelText(/CPF/), '11111111111');
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Informe o nome do paciente.')).toBeInTheDocument();
    expect(within(dialog).getByText('CPF inválido.')).toBeInTheDocument();

    await u.clear(within(dialog).getByLabelText(/CPF/));
    await u.type(within(dialog).getByLabelText(/Nome completo/), name);
    await u.type(within(dialog).getByLabelText(/CPF/), '71428793860');
    await u.type(within(dialog).getByLabelText(/Telefone \/ WhatsApp/), '35988887777');
    await u.type(within(dialog).getByLabelText('E-mail'), 'novo@exemplo.test');
    await u.click(within(dialog).getByRole('checkbox', { name: /autoriza contato/ }));
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    // cai direto na ficha do paciente
    expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument();
    expect(screen.getByText('714.287.938-60')).toBeInTheDocument();
    expect(screen.getByText('(35) 98888-7777')).toBeInTheDocument();
    expect(screen.getByText('Autorizado', { exact: false })).toBeInTheDocument();

    await u.click(screen.getByRole('tab', { name: 'Anamnese' }));
    expect(await screen.findByText('Anamnese ainda não preenchida.')).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    await u.click(within(panel).getByRole('button', { name: 'Editar' }));
    await u.click(within(panel).getByRole('checkbox', { name: 'Diabetes' }));
    await u.type(within(panel).getByLabelText(/Alergias/), 'Penicilina');
    await u.click(within(panel).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Penicilina')).toBeInTheDocument();
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
  });

  it('CPF repetido é recusado com mensagem clara', async () => {
    const u = user();
    renderApp('/pacientes');
    await u.click(await screen.findByRole('button', { name: 'Novo paciente' }));
    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByLabelText(/Nome completo/), unique('Duplicado'));
    await u.type(within(dialog).getByLabelText(/CPF/), '52998224725'); // já é da Ana Lima
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText(/Já existe um paciente com este CPF/)).toBeInTheDocument();
  });

  it('arquiva e reativa um paciente', async () => {
    const u = user();
    renderApp('/pacientes');
    await u.click(await screen.findByText('Marta Ferreira'));
    await screen.findByRole('heading', { level: 1, name: /Marta Ferreira/ });
    await u.click(screen.getByRole('button', { name: 'Arquivar' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }));
    expect(await screen.findByText('Paciente arquivado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Reativar' }));
    expect(await screen.findByRole('button', { name: 'Arquivar' })).toBeInTheDocument();
  });
});

describe('inadimplência na ficha', () => {
  it('parcela vencida bloqueia o paciente; a secretária vê o aviso e só o administrador libera, com motivo', async () => {
    const u = user();
    await loginAs('admin');
    const { patient, budget } = await seedBudget();
    await api(`/api/budgets/${budget.id}/payments`, { method: 'POST', body: { amountCents: 5000, dueDate: '2020-01-10' } });

    await loginAs('secretary');
    renderApp(`/pacientes/${patient.id}`);
    expect(await screen.findByText(/Paciente bloqueado:/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 50,00 em atraso desde 10\/01\/2020/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Liberar/ })).not.toBeInTheDocument();

    await loginAs('admin');
    renderApp(`/pacientes/${patient.id}`);
    await u.click(await screen.findByRole('button', { name: 'Liberar (exceção)' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Liberar' }));
    expect(await within(dialog).findByText('Informe o motivo da liberação.')).toBeInTheDocument();
    await u.type(within(dialog).getByLabelText(/Motivo/), 'Dor aguda');
    await u.selectOptions(within(dialog).getByLabelText('Vale por'), '2');
    await u.click(within(dialog).getByRole('button', { name: 'Liberar' }));
    expect(await screen.findByText(/Liberado por exceção/)).toBeInTheDocument();
    expect(screen.getByText(/Dor aguda/)).toBeInTheDocument();
    expect(screen.queryByText(/Paciente bloqueado:/)).not.toBeInTheDocument();
  });

  it('paciente em dia não mostra aviso nenhum', async () => {
    renderApp('/pacientes');
    await screen.findByText('Marta Ferreira');
    await user().click(screen.getByText('Marta Ferreira'));
    await screen.findByRole('heading', { level: 1, name: /Marta Ferreira/ });
    expect(screen.queryByText(/Paciente bloqueado:|Liberado por exceção/)).not.toBeInTheDocument();
  });
});
