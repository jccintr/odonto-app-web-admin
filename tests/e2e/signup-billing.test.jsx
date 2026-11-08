import { describe, expect, it } from 'vitest';
import { api, demo, loginAs, renderApp, screen, unique, user, waitFor, within } from './helpers.jsx';

describe('tela de entrada', () => {
  it('mostra a foto do consultório, o convite para criar a clínica e os links legais', async () => {
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Dentista de touca azul/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: 'Criar clínica grátis' })).toHaveAttribute('href', '/cadastro');
  });
});

describe('textos legais', () => {
  it.each([['/termos', 'Termos de Uso'], ['/privacidade', 'Política de Privacidade']])('%s abre sem login', async (path, title) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(/Versão de/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(5);
  });
});

describe('cadastro de clínica', () => {
  it('cria a clínica pela tela, escolhendo o modelo e aceitando os termos', async () => {
    const u = user();
    renderApp('/cadastro');
    expect(await screen.findByRole('heading', { name: 'Criar minha clínica' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Criar minha clínica' });
    expect(submit).toBeDisabled(); // falta tudo, inclusive aceitar os termos

    const email = `${unique('ana').replace(/\s/g, '')}@clinica-e2e.test`;
    await u.type(screen.getByLabelText(/Nome da clínica/), unique('Clínica E2E'));
    await u.type(screen.getByLabelText(/Seu nome/), 'Dra. Ana E2E');
    await u.type(screen.getByLabelText(/Seu e-mail/), email);
    await u.type(screen.getByLabelText(/^Senha/), 'senha-do-e2e-123');
    await u.type(screen.getByLabelText(/Repita a senha/), 'outra-senha-123');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    await u.clear(screen.getByLabelText(/Repita a senha/));
    await u.type(screen.getByLabelText(/Repita a senha/), 'senha-do-e2e-123');
    await u.click(screen.getByRole('radio', { name: /Ortodontia/ }));
    expect(submit).toBeDisabled();
    await u.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();

    // os preços do plano aparecem para quem quiser conferir antes de se cadastrar
    await u.click(screen.getByText('Quanto custa depois do teste?'));
    expect(screen.getByText(/Essencial/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*149,00\/mês/)).toBeInTheDocument();

    await u.click(submit);
    expect(await screen.findByRole('heading', { name: 'Quase lá!' })).toBeInTheDocument();
    expect(screen.getByText(/link de confirmação/)).toBeInTheDocument();
    expect(screen.getByText(/Seu teste grátis vai até/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toBeInTheDocument();
  });

  it('e-mail já cadastrado: mostra o erro e deixa corrigir', async () => {
    const u = user();
    renderApp('/cadastro');
    await u.type(await screen.findByLabelText(/Nome da clínica/), 'Clínica Repetida');
    await u.type(screen.getByLabelText(/Seu nome/), 'Fulana');
    await u.type(screen.getByLabelText(/Seu e-mail/), demo().admin.email);
    await u.type(screen.getByLabelText(/^Senha/), 'senha-do-e2e-123');
    await u.type(screen.getByLabelText(/Repita a senha/), 'senha-do-e2e-123');
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'Criar minha clínica' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/já cadastrado/i);
    expect(screen.getByRole('heading', { name: 'Criar minha clínica' })).toBeInTheDocument();
  });

  it('e-mail temporário é recusado com explicação', async () => {
    const u = user();
    renderApp('/cadastro');
    await u.type(await screen.findByLabelText(/Nome da clínica/), 'Clínica Temporária');
    await u.type(screen.getByLabelText(/Seu nome/), 'Fulana');
    await u.type(screen.getByLabelText(/Seu e-mail/), 'fulana@mailinator.com');
    await u.type(screen.getByLabelText(/^Senha/), 'senha-do-e2e-123');
    await u.type(screen.getByLabelText(/Repita a senha/), 'senha-do-e2e-123');
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'Criar minha clínica' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mail temporário/i);
  });
});

describe('painel da clínica em teste grátis', () => {
  it('mostra o aviso de teste e os primeiros passos, que se concluem sozinhos', async () => {
    await loginAs('admin');
    renderApp('/');
    expect(await screen.findByText(/Teste grátis: faltam \d+ dias\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos e pagamento' })).toBeInTheDocument();
    // a demonstração já tem equipe, paciente e consulta? o cartão só aparece enquanto falta algo
    const steps = await api('/api/clinic/onboarding');
    if (!steps.completed) expect(await screen.findByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();
    else expect(screen.queryByRole('heading', { name: 'Primeiros passos' })).not.toBeInTheDocument();
  });

  it('a secretária vê o aviso, mas não o atalho da assinatura nem o menu', async () => {
    await loginAs('secretary');
    renderApp('/');
    expect(await screen.findByText(/Teste grátis/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver planos e pagamento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Assinatura/ })).not.toBeInTheDocument();
  });
});

describe('assinatura (Pix)', () => {
  it('escolhe o plano, vê o Pix com QR Code, avisa o pagamento e troca de ideia só depois da confirmação', async () => {
    const u = user();
    await loginAs('admin');
    renderApp('/assinatura');
    expect(await screen.findByRole('heading', { name: 'Assinatura' })).toBeInTheDocument();
    expect(screen.getByText('Teste grátis')).toBeInTheDocument();
    expect(screen.getByText(/Escolha um plano acima/)).toBeInTheDocument();

    const clinica = screen.getByRole('region', { name: 'Plano Clínica' });
    expect(within(clinica).getByText(/R\$\s*149,00/)).toBeInTheDocument();
    expect(within(clinica).getByText('Até 4 dentistas')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Plano Premium' })).getByText('Dentistas ilimitados')).toBeInTheDocument();

    await u.click(within(clinica).getByRole('button', { name: 'Assinar este plano' }));
    expect(await screen.findByRole('heading', { name: 'Fatura em aberto' })).toBeInTheDocument();
    expect(within(clinica).getByText('Plano atual')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pix copia e cola').value).toMatch(/^00020101021126/);
    expect(screen.getByText('11144477735')).toBeInTheDocument();

    // trocar de plano antes de pagar gera nova fatura com o novo valor
    await u.click(within(screen.getByRole('region', { name: 'Plano Premium' })).getByRole('button', { name: 'Trocar para este plano' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Plano Premium' })).getByText('Plano atual')).toBeInTheDocument());
    expect(screen.getAllByText(/R\$\s*249,00/).length).toBeGreaterThan(1);

    await u.click(screen.getByRole('button', { name: 'Já paguei' }));
    const dialog = await screen.findByRole('dialog', { name: 'Já paguei' });
    await u.type(within(dialog).getByLabelText(/Observação/), 'Pix das 10h');
    await u.click(within(dialog).getByRole('button', { name: 'Avisar pagamento' }));
    expect(await screen.findByText(/Você avisou o pagamento em/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Pix copia e cola')).not.toBeInTheDocument();

    // aguardando confirmação: a API não deixa trocar de plano
    await u.click(within(screen.getByRole('region', { name: 'Plano Clínica' })).getByRole('button', { name: 'Trocar para este plano' }));
    expect(await screen.findByText(/aguardando confirmação/)).toBeInTheDocument();
  });

  it('só o administrador acessa a tela de assinatura', async () => {
    await loginAs('secretary');
    renderApp('/assinatura');
    expect(await screen.findByRole('heading', { level: 1, name: /Olá, Maria/ })).toBeInTheDocument();
  });
});

describe('meus dados (LGPD)', () => {
  it('o administrador exporta os dados e pede (e cancela) a exclusão da conta', async () => {
    const u = user();
    await loginAs('admin');
    const created = [];
    URL.createObjectURL = (blob) => { created.push(blob); return 'blob:teste'; };
    URL.revokeObjectURL = () => {};
    renderApp('/conta');
    expect(await screen.findByRole('heading', { name: 'Meus dados e privacidade' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Exportar meus dados/ }));
    await waitFor(() => expect(created).toHaveLength(1));
    const text = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(created[0]); }); // o jsdom não tem Blob.text()
    const exported = JSON.parse(text);
    expect(exported.clinic.name).toBe('Clínica Sorriso');
    expect(exported.tables.patients.length).toBeGreaterThan(0);
    expect(JSON.stringify(exported)).not.toContain('password_hash');

    await u.click(screen.getByRole('button', { name: 'Pedir exclusão da conta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pedir exclusão da conta' });
    await u.type(within(dialog).getByLabelText('Sua senha'), 'senha-errada-123');
    await u.click(within(dialog).getByRole('button', { name: 'Confirmar pedido' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/incorreta/i);

    await u.clear(within(dialog).getByLabelText('Sua senha'));
    await u.type(within(dialog).getByLabelText('Sua senha'), demo().admin.password);
    await u.click(within(dialog).getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(/Pedido de exclusão registrado em/)).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Cancelar o pedido' }));
    expect(await screen.findByRole('button', { name: 'Pedir exclusão da conta' })).toBeInTheDocument();
  });

  it('quem não é administrador não vê essa área', async () => {
    await loginAs('secretary');
    renderApp('/conta');
    expect(await screen.findByRole('heading', { name: 'Minha conta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meus dados e privacidade' })).not.toBeInTheDocument();
  });
});
