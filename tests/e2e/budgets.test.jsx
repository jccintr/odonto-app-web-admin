import { beforeEach, describe, expect, it } from 'vitest';
import { api, executeItems, loginAs, renderApp, screen, unique, user, waitFor, within } from './helpers.jsx';

/** Cria o orçamento como o dentista faria (no aplicativo: o web não cria orçamento) e abre a página dele. */
async function createBudget(u, patientName = 'Ana Lima') {
  const patient = (await api(`/api/patients?q=${encodeURIComponent(patientName)}`)).data.find((x) => x.name === patientName);
  const dentists = await api('/api/dentists');
  const procedures = (await api('/api/procedures?perPage=100')).data;
  const pick = (re) => procedures.find((p) => re.test(p.name)).id;
  const budget = await api('/api/budgets', { method: 'POST', body: {
    patientId: patient.id, dentistId: dentists.find((d) => d.name === 'Dr. Paulo Lima').id,
    items: [{ procedureId: pick(/Restauração em resina/), tooth: 16, faces: 'O' }, { procedureId: pick(/Limpeza/) }],
  } });
  renderApp(`/orcamentos/${budget.id}`);
  return screen.findByRole('link', { name: '← Orçamentos' });
}

beforeEach(async () => { await loginAs('admin'); });

/** Abre a aprovação do paciente (botão do cabeçalho), ajusta o que for preciso e confirma. */
async function approve(u, { label = 'Aprovar', skip = [], discount } = {}) {
  await u.click(await screen.findByRole('button', { name: label }));
  const dialog = await screen.findByRole('dialog');
  for (const name of skip) await u.click(within(dialog).getByRole('checkbox', { name: new RegExp(name) }));
  if (discount !== undefined) {
    await u.clear(within(dialog).getByLabelText('Desconto desta aprovação'));
    if (discount) await u.type(within(dialog).getByLabelText('Desconto desta aprovação'), String(discount));
  }
  await u.click(within(dialog).getByRole('button', { name: 'Aprovar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); // fecha só depois de salvar
  expect(await screen.findByText('Aprovação registrada.')).toBeInTheDocument();
}

describe('orçamentos e pagamentos', () => {
  it('cria o orçamento, calcula o total, aprova, parcela e recebe', async () => {
    const u = user();
    await createBudget(u);

    // R$ 200,00 + R$ 150,00
    const summary = (await screen.findAllByText('Subtotal'))[0].closest('dl'); // [1] é a versão de impressão
    expect(within(summary).getAllByText('R$ 350,00')).toHaveLength(2); // subtotal e total (ainda sem desconto)
    expect(screen.getByText('16 (O)')).toBeInTheDocument();

    // desconto
    await u.click(screen.getByRole('button', { name: 'Desconto' }));
    const discount = await screen.findByRole('dialog');
    await u.clear(within(discount).getByLabelText('Desconto'));
    await u.type(within(discount).getByLabelText('Desconto'), '50');
    await u.click(within(discount).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(within(screen.getAllByText('Total')[0].closest('div')).getByText('R$ 300,00')).toBeInTheDocument());

    // aprovar
    await approve(u); // o desconto combinado no orçamento (R$ 50,00) vem preenchido
    expect(await screen.findByRole('button', { name: 'Gerar parcelas' })).toBeInTheDocument();

    // 3 parcelas de R$ 100,00
    await u.click(screen.getByRole('button', { name: 'Gerar parcelas' }));
    const plan = await screen.findByRole('dialog');
    expect(within(plan).getByText(/3x de aproximadamente/)).toHaveTextContent('R$ 100,00');
    await u.click(within(plan).getByRole('button', { name: 'Gerar parcelas' }));
    expect(await screen.findByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();

    // recebe a primeira em dinheiro
    await u.click(screen.getAllByRole('button', { name: 'Receber' })[0]);
    const receive = await screen.findByRole('dialog');
    await u.selectOptions(within(receive).getByLabelText('Forma de pagamento'), 'cash');
    await u.click(within(receive).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Recebimento registrado.')).toBeInTheDocument();
    expect(await screen.findByText('Dinheiro')).toBeInTheDocument();
  });

  it('aprovado, os procedimentos ficam "a realizar" (sem baixa direta) e só o atendimento do dentista os executa', async () => {
    const u = user();
    await createBudget(u, 'Carlos Souza');
    expect((await screen.findAllByText('Proposto')).length).toBe(2);
    await approve(u);
    expect(await screen.findAllByText('A realizar')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Realizar' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Em tratamento');

    // o dentista executa no atendimento (pela API, como o app faz) e a tela passa a mostrar tudo realizado
    const budget = (await api('/api/budgets?perPage=5')).data.find((x) => x.patient.name === 'Carlos Souza' && x.status === 'approved');
    const detail = await api(`/api/budgets/${budget.id}`);
    await executeItems({ budget, patientId: budget.patient.id, dentistId: budget.dentist.id, itemIds: detail.items.map((i) => i.id) });
    renderApp(`/orcamentos/${budget.id}`);
    expect(await screen.findAllByText('Realizado')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Concluído');
  });

  it('o paciente aprova só parte e o resto depois: cada aprovação tem desconto e parcelas próprios', async () => {
    const u = user();
    await createBudget(u, 'Marta Ferreira'); // restauração R$ 200,00 + limpeza R$ 150,00

    // 1ª aprovação: só a restauração, com R$ 20,00 de desconto
    await approve(u, { skip: ['Limpeza'], discount: 20 });
    expect(await screen.findAllByText('Proposto')).toHaveLength(1);
    expect(screen.getAllByText('A realizar')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Em tratamento');
    expect(screen.getByText(/1ª ·/)).toHaveTextContent('desc. R$ 20,00');

    // 2ª aprovação, depois: a limpeza, sem desconto
    await approve(u, { label: 'Aprovar mais procedimentos', discount: 0 });
    expect(screen.queryByRole('button', { name: 'Aprovar mais procedimentos' })).not.toBeInTheDocument();
    expect(await screen.findByText(/2ª ·/)).not.toHaveTextContent('desc.');

    // parcelas da 2ª aprovação (saldo R$ 150,00): a 1ª fica como estava
    await u.click(screen.getByRole('button', { name: 'Gerar parcelas' }));
    let plan = await screen.findByRole('dialog');
    await u.selectOptions(within(plan).getByLabelText('Aprovação'), within(plan).getByRole('option', { name: /Aprovação 2/ }));
    expect(within(plan).getByText(/3x de aproximadamente/)).toHaveTextContent('R$ 50,00');
    await u.click(within(plan).getByRole('button', { name: 'Gerar parcelas' }));
    expect(await screen.findByText('1/3')).toBeInTheDocument();

    // e as da 1ª aprovação (saldo R$ 180,00), em 2 vezes
    await u.click(screen.getByRole('button', { name: 'Gerar parcelas' }));
    plan = await screen.findByRole('dialog');
    await u.selectOptions(within(plan).getByLabelText('Aprovação'), within(plan).getByRole('option', { name: /Aprovação 1/ }));
    await u.clear(within(plan).getByLabelText('Número de parcelas'));
    await u.type(within(plan).getByLabelText('Número de parcelas'), '2');
    expect(within(plan).getByText(/2x de aproximadamente/)).toHaveTextContent('R$ 90,00');
    await u.click(within(plan).getByRole('button', { name: 'Gerar parcelas' }));
    expect(await screen.findByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument(); // as parcelas anteriores seguem iguais
  });

  it('com desconto à vista configurado, a aprovação sugere o valor e o paciente aprova com ele', async () => {
    const u = user();
    await api('/api/clinic', { method: 'PATCH', body: { cashDiscountPercent: 10 } });
    try {
      await createBudget(u, 'Ana Lima'); // R$ 350,00
      await u.click(await screen.findByRole('button', { name: 'Aprovar' }));
      const dialog = await screen.findByRole('dialog');
      await u.click(within(dialog).getByRole('button', { name: /Pagamento à vista: 10% \(R\$ 35,00\)/ }));
      expect(within(dialog).getByLabelText('Desconto desta aprovação')).toHaveValue('35,00');
      expect(within(dialog).getByText(/Total desta aprovação/)).toHaveTextContent('R$ 315,00');
      await u.click(within(dialog).getByRole('button', { name: 'Aprovar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await screen.findByText(/1ª ·/)).toHaveTextContent('desc. R$ 35,00');
    } finally {
      await api('/api/clinic', { method: 'PATCH', body: { cashDiscountPercent: 0 } });
    }
  });

  it('o financeiro mostra parcelas vencidas e permite receber', async () => {
    const u = user();
    const name = unique('Devedor');
    // paciente com parcela vencida criada direto pela API
    const token = localStorage.getItem('odonto:access');
    const call = (path, method, body) => fetch(path, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) }).then((r) => r.json());
    const patient = await call('/api/patients', 'POST', { name });
    const dentists = await fetch('/api/dentists', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
    const procs = await fetch('/api/procedures', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
    const budget = await call('/api/budgets', 'POST', { patientId: patient.id, dentistId: dentists[0].id, items: [{ procedureId: procs.data[0].id }] });
    await call(`/api/budgets/${budget.id}/status`, 'POST', { status: 'approved' });
    await call(`/api/budgets/${budget.id}/payments`, 'POST', { amountCents: 5000, dueDate: '2020-01-10' });

    renderApp('/financeiro');
    const row = (await screen.findByText(name)).closest('tr');
    expect(within(row).getByText('Vencido')).toBeInTheDocument();
    await u.click(within(row).getByRole('button', { name: 'Receber' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.queryByText(name)).not.toBeInTheDocument());
  });
});

describe('procedimentos', () => {
  it('o administrador cadastra e edita; os valores aparecem formatados', async () => {
    const u = user();
    const name = unique('Faceta');
    renderApp('/procedimentos');
    await u.click(await screen.findByRole('button', { name: 'Novo procedimento' }));
    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByLabelText(/Nome/), name);
    await u.clear(within(dialog).getByLabelText('Preço cobrado'));
    await u.type(within(dialog).getByLabelText('Preço cobrado'), '1.250,50');
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    const row = (await screen.findByText(name)).closest('tr');
    expect(within(row).getByText('R$ 1.250,50')).toBeInTheDocument();

    await u.click(within(row).getByRole('button', { name: 'Editar' }));
    const edit = await screen.findByRole('dialog');
    await u.clear(within(edit).getByLabelText('Preço cobrado'));
    await u.type(within(edit).getByLabelText('Preço cobrado'), '1300');
    await u.click(within(edit).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(within(screen.getByText(name).closest('tr')).getByText('R$ 1.300,00')).toBeInTheDocument());
  });

  it('a secretária vê a tabela mas não edita nem vê o custo', async () => {
    await loginAs('secretary');
    renderApp('/procedimentos');
    expect(await screen.findByText('Limpeza (profilaxia)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo procedimento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Custo' })).not.toBeInTheDocument();
  });

  it('a secretária não monta o orçamento: não cria, não inclui item nem dá desconto, mas registra a aprovação', async () => {
    const patient = await api('/api/patients', { method: 'POST', body: { name: unique('Paciente da secretária'), contactConsent: false } });
    const dentists = await api('/api/dentists');
    const procedures = await api('/api/procedures?perPage=100');
    const proc = procedures.data.find((p) => p.name === 'Restauração em resina');
    const budget = await api('/api/budgets', { method: 'POST', body: { patientId: patient.id, dentistId: dentists[0].id, items: [{ procedureId: proc.id, tooth: 16 }] } });

    await loginAs('secretary');
    renderApp('/orcamentos');
    expect(await screen.findByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument();
    await screen.findAllByRole('row');
    expect(screen.queryByRole('button', { name: 'Novo orçamento' })).not.toBeInTheDocument(); // ninguém cria orçamento no web

    renderApp(`/orcamentos/${budget.id}`);
    expect(await screen.findByText('Restauração em resina')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desconto' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });
});
