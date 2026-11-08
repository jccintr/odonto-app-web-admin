import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setSuspendedHandler } from '../../src/api/client.js';
import { BillingBanner, BlockedScreen } from '../../src/components/BillingBanner.jsx';
import PixPayment from '../../src/components/PixPayment.jsx';
import Turnstile from '../../src/components/Turnstile.jsx';
import { BillingProvider, useBilling } from '../../src/context/BillingContext.jsx';
import { UIProvider } from '../../src/context/UIContext.jsx';
import {
  BILLING_STATE, bannerFor, dentistLimitLabel, exportFileName, isOpenWhenBlocked, periodLabel, pixProblem, pluralDays,
} from '../../src/lib/billing.js';

const auth = { user: { id: 'u1' }, isAdmin: true };
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));
const status = vi.fn();
vi.mock('../../src/api/index.js', () => ({ Billing: { status: (...a) => status(...a) } }));

const st = (o) => ({ state: 'trial', blocked: false, endsOn: '2026-11-20', daysLeft: 10, graceEndsOn: '2026-11-27', planName: null, ...o });

describe('lib/billing', () => {
  it('rótulos de cada situação e plural de dias', () => {
    expect(Object.keys(BILLING_STATE)).toEqual(['trial', 'active', 'courtesy', 'past_due', 'suspended', 'canceled']);
    expect(pluralDays(1)).toBe('1 dia');
    expect(pluralDays(3)).toBe('3 dias');
  });

  it('aviso do topo: teste, atraso e vencimento próximo; nada nos outros casos', () => {
    expect(bannerFor(null)).toBeNull();
    expect(bannerFor(st({ daysLeft: 10 }))).toEqual({ tone: 'info', text: 'Teste grátis: faltam 10 dias.' });
    expect(bannerFor(st({ daysLeft: 1 })).text).toBe('Teste grátis: falta 1 dia.');
    expect(bannerFor(st({ daysLeft: 0 })).text).toBe('Hoje é o último dia do seu teste grátis.');
    expect(bannerFor(st({ state: 'past_due', daysLeft: -3, graceEndsOn: '2026-11-27' }))).toEqual({
      tone: 'warning', text: 'Pagamento em atraso há 3 dias. Regularize até 27/11/2026 para não perder o acesso.',
    });
    expect(bannerFor(st({ state: 'active', daysLeft: 5 })).text).toBe('Sua assinatura vence em 5 dias.');
    expect(bannerFor(st({ state: 'active', daysLeft: 0 })).text).toBe('Sua assinatura vence hoje.');
    expect(bannerFor(st({ state: 'active', daysLeft: 6 }))).toBeNull();
    for (const state of ['courtesy', 'suspended', 'canceled']) expect(bannerFor(st({ state }))).toBeNull();
  });

  it('período, limite de dentistas e rotas abertas com a assinatura suspensa', () => {
    expect(periodLabel({ periodStart: '2026-12-01', periodEnd: '2026-12-31' })).toBe('01/12/2026 a 31/12/2026');
    expect(dentistLimitLabel(null)).toBe('Dentistas ilimitados');
    expect(dentistLimitLabel(1)).toBe('1 dentista');
    expect(dentistLimitLabel(4)).toBe('Até 4 dentistas');
    expect(isOpenWhenBlocked('/assinatura')).toBe(true);
    expect(isOpenWhenBlocked('/conta')).toBe(true);
    expect(isOpenWhenBlocked('/conta/algo')).toBe(true);
    expect(isOpenWhenBlocked('/pacientes')).toBe(false);
    expect(isOpenWhenBlocked('/contabil')).toBe(false);
  });

  it('motivos do Pix sem "copia e cola" e nome do arquivo exportado', () => {
    expect(pixProblem('PIX_KEY_AMBIGUOUS')).toContain('duas formas');
    expect(pixProblem('PIX_KEY_INVALID')).toContain('inválida');
    expect(pixProblem('PIX_KEY_EMPTY')).toContain('não foi configurada');
    expect(pixProblem('OUTRO')).toContain('Não foi possível gerar');
    expect(exportFileName({ slug: 'sorriso' }, '2026-11-03')).toBe('odontoapp-sorriso-2026-11-03.json');
  });
});

describe('cliente da API: assinatura suspensa (402)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { vi.unstubAllGlobals(); setSuspendedHandler(null); });
  const reply = (status, body) => fetch.mockResolvedValue({ ok: status < 400, status, json: async () => body });

  it('avisa quem está ouvindo, mas só no 402 de assinatura', async () => {
    const handler = vi.fn();
    setSuspendedHandler(handler);
    reply(402, { error: 'Assinatura suspensa.', code: 'SUBSCRIPTION_SUSPENDED' });
    await expect(request('/api/patients', { auth: false })).rejects.toMatchObject({ status: 402, code: 'SUBSCRIPTION_SUSPENDED' });
    expect(handler).toHaveBeenCalledTimes(1);

    reply(402, { error: 'Outro motivo.' });
    await expect(request('/api/x', { auth: false })).rejects.toMatchObject({ status: 402 });
    reply(402, null);
    await expect(request('/api/x', { auth: false })).rejects.toMatchObject({ status: 402 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('sem ninguém ouvindo, o erro sai normalmente', async () => {
    reply(402, { error: 'Assinatura suspensa.', code: 'SUBSCRIPTION_SUSPENDED' });
    await expect(request('/api/patients', { auth: false })).rejects.toMatchObject({ code: 'SUBSCRIPTION_SUSPENDED' });
  });
});

function Probe() {
  const { status: s, blocked } = useBilling();
  return <p>{s ? `${s.state}:${blocked}` : 'sem situação'}</p>;
}

describe('BillingProvider', () => {
  afterEach(() => { status.mockReset(); auth.user = { id: 'u1' }; setSuspendedHandler(null); });

  it('carrega a situação e recarrega quando a API responde 402 no meio do uso', async () => {
    status.mockResolvedValueOnce(st({ state: 'trial' })).mockResolvedValueOnce(st({ state: 'suspended', blocked: true }));
    render(<BillingProvider><Probe /></BillingProvider>);
    expect(await screen.findByText('trial:false')).toBeInTheDocument();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({ code: 'SUBSCRIPTION_SUSPENDED', error: 'x' }) });
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => { await request('/api/patients', { auth: false }).catch(() => {}); });
    expect(await screen.findByText('suspended:true')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('erro ao carregar não derruba o painel; sem usuário não busca nada', async () => {
    status.mockRejectedValue(new Error('fora do ar'));
    render(<BillingProvider><Probe /></BillingProvider>);
    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(screen.getByText('sem situação')).toBeInTheDocument();

    status.mockClear();
    auth.user = null;
    render(<BillingProvider><Probe /></BillingProvider>);
    expect(status).not.toHaveBeenCalled();
  });
});

describe('aviso e tela de bloqueio', () => {
  afterEach(() => { status.mockReset(); auth.isAdmin = true; });
  const mount = (ui) => render(<MemoryRouter><BillingProvider>{ui}</BillingProvider></MemoryRouter>);

  it('faixa de teste para o administrador, com atalho para os planos', async () => {
    status.mockResolvedValue(st({ daysLeft: 3 }));
    mount(<BillingBanner />);
    expect(await screen.findByText('Teste grátis: faltam 3 dias.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planos e pagamento' })).toHaveAttribute('href', '/assinatura');
  });

  it('quem não é administrador vê o aviso sem o atalho; sem aviso, nada aparece', async () => {
    auth.isAdmin = false;
    status.mockResolvedValue(st({ state: 'past_due', daysLeft: -2 }));
    mount(<BillingBanner />);
    expect(await screen.findByText(/Pagamento em atraso há 2 dias/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('assinatura em dia: nenhuma faixa', async () => {
    status.mockResolvedValue(st({ state: 'active', daysLeft: 20 }));
    const { container } = mount(<BillingBanner />);
    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('bloqueio: o administrador vê como regularizar e como exportar os dados', async () => {
    status.mockResolvedValue(st({ state: 'suspended', blocked: true }));
    mount(<BlockedScreen />);
    expect(await screen.findByRole('heading', { name: 'Assinatura suspensa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regularizar assinatura' })).toHaveAttribute('href', '/assinatura');
    expect(screen.getByRole('link', { name: /Minha conta/ })).toHaveAttribute('href', '/conta');
  });

  it('bloqueio por cancelamento e para quem não administra', async () => {
    auth.isAdmin = false;
    status.mockResolvedValue(st({ state: 'canceled', blocked: true }));
    mount(<BlockedScreen />);
    expect(await screen.findByRole('heading', { name: 'Assinatura cancelada' })).toBeInTheDocument();
    expect(screen.getByText(/Avise o administrador/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('PixPayment', () => {
  const pix = { key: '11144477735', beneficiary: 'OdontoApp', instructions: null, payload: '00020126330014br.gov.bcb.pix0111111444777355204000053039865802BR5909ODONTOAPP6008BRASILIA62070503***6304ABCD', reason: null };
  const mount = (value) => render(<UIProvider><PixPayment pix={value} /></UIProvider>);

  it('sem Pix configurado, avisa', () => {
    mount(null);
    expect(screen.getByText(/ainda não está configurado/)).toBeInTheDocument();
  });

  it('mostra o QR Code, o copia e cola e copia para a área de transferência', async () => {
    const u = userEvent.setup(); // o user-event instala a própria área de transferência: a nossa vem depois
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    mount({ ...pix, instructions: 'Envie o comprovante.' });
    expect(await screen.findByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pix copia e cola')).toHaveValue(pix.payload);
    expect(screen.getByText('Envie o comprovante.')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Copiar código/ }));
    expect(writeText).toHaveBeenCalledWith(pix.payload);
    expect(await screen.findByText('Código Pix copiado.')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Copiar chave/ }));
    expect(writeText).toHaveBeenCalledWith('11144477735');
  });

  it('se copiar falhar, orienta a copiar à mão', async () => {
    const u = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('negado')) }, configurable: true });
    mount(pix);
    await u.click(await screen.findByRole('button', { name: /Copiar código/ }));
    expect(await screen.findByText(/Selecione o texto e copie/)).toBeInTheDocument();
  });

  it('chave que não gerou QR: explica o motivo e ainda mostra a chave', () => {
    mount({ ...pix, payload: null, reason: 'PIX_KEY_AMBIGUOUS' });
    expect(screen.getByText(/duas formas/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'QR Code do Pix' })).not.toBeInTheDocument();
    expect(screen.getByText('11144477735')).toBeInTheDocument();
  });
});

describe('Turnstile', () => {
  afterEach(() => { delete window.turnstile; document.head.querySelectorAll('script').forEach((s) => s.remove()); });

  it('renderiza o widget, repassa o token e limpa ao sair', async () => {
    const remove = vi.fn();
    let options;
    window.turnstile = { render: vi.fn((el, o) => { options = o; return 'w1'; }), remove };
    const onToken = vi.fn();
    const { unmount } = render(<Turnstile siteKey="chave-publica" onToken={onToken} />);
    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalled());
    expect(options.sitekey).toBe('chave-publica');
    options.callback('token-1');
    options['expired-callback']();
    options['error-callback']();
    expect(onToken.mock.calls.map((c) => c[0])).toEqual(['token-1', null, null]);
    unmount();
    expect(remove).toHaveBeenCalledWith('w1');
  });

  it('carrega o script da Cloudflare quando ainda não existe e avisa se falhar', async () => {
    const onToken = vi.fn();
    render(<Turnstile siteKey="k" onToken={onToken} />);
    const tag = document.head.querySelector('script[src*="challenges.cloudflare.com"]');
    expect(tag).toBeTruthy();
    tag.onerror();
    await waitFor(() => expect(onToken).toHaveBeenCalledWith(null));
  });

  it('desmontar antes do script carregar não renderiza nada', async () => {
    const { unmount } = render(<Turnstile siteKey="k" onToken={() => {}} />);
    const tag = document.head.querySelector('script[src*="challenges.cloudflare.com"]');
    unmount();
    const render2 = vi.fn();
    window.turnstile = { render: render2, remove: vi.fn() };
    tag.onload();
    await Promise.resolve();
    expect(render2).not.toHaveBeenCalled();
  });
});

