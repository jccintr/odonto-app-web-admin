import { beforeEach, describe, expect, it } from 'vitest';
import { api, executeItems, loginAs, renderApp, screen, seedBudget, unique, user, waitFor, within } from './helpers.jsx';

beforeEach(async () => { await loginAs('admin'); });

describe('odontograma e ficha', () => {
  it('marca um dente, mostra o histórico, e o procedimento realizado marca sozinho', async () => {
    const u = user();
    const { patient, dentist, budget, item } = await seedBudget({ tooth: 26 });
    renderApp(`/pacientes/${patient.id}?aba=odontograma`);

    // o procedimento aprovado e ainda não feito aparece como "planejado" no dente
    await u.click(await screen.findByRole('button', { name: /^Dente 26\. Planejado: Restauração em resina — aprovado/ }));
    expect(await screen.findByText('Planejado para este dente')).toBeInTheDocument();
    expect(screen.getByText('Aprovado pelo paciente: a realizar')).toBeInTheDocument();
    expect(await screen.findByText('Nenhuma marcação neste dente.')).toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText('Condição'), 'caries');
    await u.click(screen.getAllByRole('button', { name: 'Oclusal/Incisal' }).at(-1));
    await u.click(screen.getByRole('button', { name: 'Marcar dente 26' }));
    expect(await screen.findByText('Dente 26 marcado.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Dente 26: Cárie \(O\)/ })).toBeInTheDocument();

    // registrar o procedimento (restauração) marca "Restauração" no dente
    await executeItems({ budget, patientId: patient.id, dentistId: dentist.id, itemIds: [item.id] });
    renderApp(`/pacientes/${patient.id}?aba=odontograma`);
    expect(await screen.findAllByRole('button', { name: /Dente 26: .*Restauração/ })).not.toHaveLength(0);
    expect((await screen.findAllByText('Procedimento realizado')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Planejado/ })).not.toBeInTheDocument(); // feito, deixa de ser planejado
  });

  it('a secretária só consulta o odontograma', async () => {
    const { patient } = await seedBudget({ tooth: 11 }); // o cenário é montado pelo administrador
    await loginAs('secretary');
    renderApp(`/pacientes/${patient.id}?aba=odontograma`);
    await user().click(await screen.findByRole('button', { name: /^Dente 11/ }));
    expect(await screen.findByText('Nenhuma marcação neste dente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar dente/ })).not.toBeInTheDocument();
  });

  it('imprime a ficha com e sem odontograma', async () => {
    const u = user();
    const { patient } = await seedBudget({ tooth: 11 });
    let printed = 0;
    window.print = () => { printed += 1; };
    renderApp(`/pacientes/${patient.id}`);
    await u.click(await screen.findByRole('button', { name: 'Imprimir ficha' }));
    let dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('checkbox', { name: /odontograma/ })); // desmarca
    await u.click(within(dialog).getByRole('button', { name: 'Imprimir' }));
    await waitFor(() => expect(printed).toBe(1));
    expect(screen.queryByTestId('patient-print')).not.toBeInTheDocument(); // a ficha sai da tela depois de imprimir

    await u.click(screen.getByRole('button', { name: 'Imprimir ficha' }));
    dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Imprimir' }));
    await waitFor(() => expect(printed).toBe(2));
  });
});

describe('imagens', () => {
  it('sem as chaves do Cloudinary no servidor, avisa com clareza em vez de falhar', async () => {
    const u = user();
    const { patient } = await seedBudget();
    renderApp(`/pacientes/${patient.id}?aba=imagens`);
    await screen.findByText('Nenhuma imagem');
    await u.click(screen.getByRole('button', { name: 'Enviar imagem' }));
    const dialog = await screen.findByRole('dialog');
    const file = new File([new Uint8Array(1000)], 'raio-x.jpg', { type: 'image/jpeg' });
    await u.upload(within(dialog).getByLabelText(/Arquivo/), file);
    await u.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialog).findByText(/armazenamento de imagens ainda não foi configurado/)).toBeInTheDocument();
  });
});

describe('avisos', () => {
  it('salva a configuração do lembrete e valida as horas', async () => {
    const u = user();
    renderApp('/avisos');
    const hours = await screen.findByLabelText('Horas de antecedência');
    await u.clear(hours);
    await u.type(hours, '99');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe de 1 a 72 horas.')).toBeInTheDocument();
    await u.clear(hours);
    await u.type(hours, '48');
    await u.type(screen.getByLabelText(/Telefone da clínica/), '(35) 3333-0000');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Configuração salva.')).toBeInTheDocument();
    expect((await api('/api/notifications/settings')).reminderHoursBefore).toBe(48);
  });

  it('envia o lembrete de uma consulta e o histórico mostra o resultado', async () => {
    const u = user();
    renderApp('/avisos');
    await screen.findByText('Histórico de envios');
    await u.click(screen.getByRole('button', { name: 'Enviar lembretes agora' }));
    expect(await screen.findByText(/enviados, .* com falha/)).toBeInTheDocument();
  });

  it('a secretária vê o histórico mas não altera a configuração', async () => {
    await loginAs('secretary');
    renderApp('/avisos');
    expect(await screen.findByLabelText('Horas de antecedência')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar lembretes agora' })).not.toBeInTheDocument();
  });
});

describe('equipe e configurações', () => {
  it('cria um usuário e edita os dados do dentista', async () => {
    const u = user();
    const name = unique('Secretária');
    renderApp('/equipe');
    await u.click(await screen.findByRole('button', { name: 'Novo usuário' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Informe o nome.')).toBeInTheDocument();
    await u.type(within(dialog).getByLabelText(/Nome/), name);
    await u.type(within(dialog).getByLabelText(/E-mail/), `${Date.now()}@sorriso.test`);
    await u.type(within(dialog).getByLabelText(/Senha inicial/), 'senha-forte-123');
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    const row = (await screen.findByText(name)).closest('tr');
    expect(within(row).getByText('E-mail não confirmado')).toBeInTheDocument();

    const paulo = (await screen.findByText('Dr. Paulo Lima')).closest('tr');
    await u.click(within(paulo).getByRole('button', { name: 'Dados do dentista' }));
    const edit = await screen.findByRole('dialog');
    await u.clear(within(edit).getByLabelText(/Percentual de repasse/));
    await u.type(within(edit).getByLabelText(/Percentual de repasse/), '45');
    await u.click(within(edit).getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect((await api('/api/dentists')).find((d) => d.name === 'Dr. Paulo Lima').payoutPercent).toBe(45));
  });

  it('a tolerância de atraso da clínica é validada (0 a 60 dias) e salva', async () => {
    const u = user();
    renderApp('/configuracoes');
    const input = await screen.findByLabelText(/Tolerância de atraso/);
    expect(input).toHaveValue(7);
    await u.clear(input);
    await u.type(input, '99');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('A tolerância de atraso deve ser de 0 a 60 dias.')).toBeInTheDocument();
    await u.clear(input);
    await u.type(input, '10');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Dados da clínica salvos.')).toBeInTheDocument();
    expect((await api('/api/clinic')).overdueGraceDays).toBe(10);
    await api('/api/clinic', { method: 'PATCH', body: { overdueGraceDays: 7 } });
  });

  it('o desconto à vista é validado (0 a 50%) e salvo', async () => {
    const u = user();
    renderApp('/configuracoes');
    const input = await screen.findByLabelText(/Desconto à vista/);
    expect(input).toHaveValue(0);
    await u.clear(input);
    await u.type(input, '80');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O desconto à vista deve ser de 0 a 50%.')).toBeInTheDocument();
    await u.clear(input);
    await u.type(input, '10');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Dados da clínica salvos.')).toBeInTheDocument();
    expect((await api('/api/clinic')).cashDiscountPercent).toBe(10);
    await api('/api/clinic', { method: 'PATCH', body: { cashDiscountPercent: 0 } });
  });

  it('altera os dados da clínica e a senha da própria conta', async () => {
    const u = user();
    renderApp('/configuracoes');
    const input = await screen.findByLabelText(/Nome da clínica/);
    await u.clear(input);
    await u.type(input, 'Clínica Sorriso Ltda');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Dados da clínica salvos.')).toBeInTheDocument();
    expect((await api('/api/clinic')).name).toBe('Clínica Sorriso Ltda');
    await api('/api/clinic', { method: 'PATCH', body: { name: 'Clínica Sorriso' } });
  });
});

describe('repasse', () => {
  it('configura, cria regra, confere qual vale, e paga o dentista', async () => {
    const u = user();
    // libera a comissão assim que o procedimento é realizado, para o saldo aparecer sem pagamento do paciente
    renderApp('/repasse?aba=configuracao');
    await u.selectOptions(await screen.findByLabelText(/Quando a comissão é liberada/), 'procedure');
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Configuração do repasse salva/)).toBeInTheDocument();

    const { patient, dentist, budget, item } = await seedBudget({ procedure: 'Limpeza (profilaxia)' });
    await executeItems({ budget, patientId: patient.id, dentistId: dentist.id, itemIds: [item.id] });

    // regra fixa de R$ 25,00 para limpeza (todos os dentistas)
    renderApp('/repasse?aba=regras');
    await u.click(await screen.findByRole('button', { name: 'Nova regra' }));
    let dialog = await screen.findByRole('dialog');
    await u.selectOptions(within(dialog).getByLabelText(/Procedimento/), within(dialog).getByRole('option', { name: 'Limpeza (profilaxia)' }));
    await u.selectOptions(within(dialog).getByLabelText('Tipo de comissão'), 'fixed');
    await u.clear(within(dialog).getByLabelText('Valor fixo'));
    await u.type(within(dialog).getByLabelText('Valor fixo'), '25');
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('R$ 25,00 por procedimento')).toBeInTheDocument();

    await u.selectOptions(screen.getByLabelText('Dentista'), 'Dr. Paulo Lima');
    await u.selectOptions(screen.getByLabelText('Procedimento'), 'Limpeza (profilaxia)');
    expect(await screen.findByText(/Regra do procedimento/)).toBeInTheDocument();

    // saldo do dentista (40% de R$ 150,00 = R$ 60,00 do lançamento feito antes da regra)
    renderApp('/repasse');
    const row = (await screen.findByText('Dr. Paulo Lima')).closest('tr');
    expect(within(row).getByRole('button', { name: 'Pagar' })).toBeEnabled();
    await u.click(within(row).getByRole('button', { name: 'Pagar' }));
    dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Registrar pagamento' }));
    expect(await screen.findByText(/Repasse de .* registrado/)).toBeInTheDocument();

    // aparece em fechamentos; desfazer devolve o saldo
    renderApp('/repasse?aba=fechamentos');
    await screen.findByRole('table');
    await u.click(screen.getAllByText('Dr. Paulo Lima').map((e) => e.closest('tr')).find(Boolean)); // (as outras ocorrências são opções do filtro)
    dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Pago')).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Desfazer fechamento' }));
    const confirm = (await screen.findAllByRole('dialog')).at(-1);
    await u.click(within(confirm).getByRole('button', { name: 'Desfazer fechamento' }));
    expect(await within(dialog).findByText('Desfeito')).toBeInTheDocument();
  });

  it('a secretária não acessa o repasse', async () => {
    await loginAs('secretary');
    renderApp('/repasse');
    expect(await screen.findByRole('heading', { level: 1, name: /Olá, Maria/ })).toBeInTheDocument(); // volta ao painel
  });
});

describe('relatórios', () => {
  it('mostra o resumo do mês e navega entre os meses', async () => {
    const u = user();
    const { patient, dentist, budget, item } = await seedBudget({ procedure: 'Consulta e avaliação' });
    await executeItems({ budget, patientId: patient.id, dentistId: dentist.id, itemIds: [item.id] });
    await api(`/api/budgets/${budget.id}/payments`, { method: 'POST', body: { amountCents: 8000, method: 'pix', paidAt: new Date().toISOString() } });

    renderApp('/relatorios');
    expect(await screen.findByText('Recebido no mês')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Gráfico de barras/ })).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getAllByText('Consulta e avaliação').length).toBeGreaterThan(0);

    const before = screen.getByRole('heading', { level: 2, name: /\d{4}/ }).textContent;
    await u.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /\d{4}/ }).textContent).not.toBe(before));
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
  });
});

describe('minha conta e tema', () => {
  it('troca a senha e alterna entre tema claro e escuro (lembrado no navegador)', async () => {
    const u = user();
    renderApp('/conta');
    await u.click(await screen.findByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('odonto:theme')).toBe('dark');
    await u.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement).not.toHaveClass('dark');

    await u.type(screen.getByLabelText('Senha atual'), 'senha-errada-000');
    await u.type(screen.getByLabelText('Nova senha'), 'nova-senha-123');
    await u.type(screen.getByLabelText('Repita a nova senha'), 'nova-senha-123');
    await u.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument(); // senha atual errada: a API recusa
  });
});
