import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, fieldErrors, getAccessToken, hasSession, request, setSession, setUnauthorizedHandler } from '../../src/api/client.js';

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
let fetchMock;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); setUnauthorizedHandler(() => {}); });
afterEach(() => vi.unstubAllGlobals());

describe('armazenamento bloqueado (modo privado)', () => {
  it('não quebra: a sessão só dura até recarregar', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(getAccessToken()).toBeNull();
    expect(() => setSession({ accessToken: 'a', refreshToken: 'r' })).not.toThrow();
    expect(() => setSession(null)).not.toThrow();
    [get, set, remove].forEach((spy) => spy.mockRestore());
  });
});

describe('sessão guardada', () => {
  it('guarda e limpa os tokens', () => {
    expect(hasSession()).toBe(false);
    setSession({ accessToken: 'a', refreshToken: 'r' });
    expect(getAccessToken()).toBe('a');
    expect(hasSession()).toBe(true);
    setSession(null);
    expect(getAccessToken()).toBeNull();
    expect(hasSession()).toBe(false);
  });
});

describe('request', () => {
  it('envia o token, o corpo em JSON e monta a query sem valores vazios', async () => {
    setSession({ accessToken: 'tok', refreshToken: 'ref' });
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    expect(await request('/api/x', { method: 'POST', body: { a: 1 }, query: { q: 'ana', vazio: '', nulo: null, n: 0, f: false } })).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/x?q=ana&n=0&f=false');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' } });
  });

  it('sem corpo e sem query não manda cabeçalho de JSON nem "?"', async () => {
    fetchMock.mockResolvedValue(json(200, []));
    await request('/api/x', { auth: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/x');
    expect(init.headers).toEqual({});
  });

  it('204 devolve null; erro vira ApiError com mensagem, código e detalhes', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    expect(await request('/api/x', { auth: false })).toBeNull();
    fetchMock.mockResolvedValueOnce(json(409, { error: 'Horário indisponível', code: 'SLOT_TAKEN', details: [{ field: 'a', message: 'b' }], retryAfterSeconds: 30 }));
    const err = await request('/api/x', { auth: false }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, message: 'Horário indisponível', code: 'SLOT_TAKEN', retryAfterSeconds: 30 });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('html'); } });
    expect(await request('/api/x', { auth: false }).catch((e) => e.message)).toBe('Não foi possível concluir a operação.');
  });

  it('sem internet: mensagem clara; chamada cancelada repassa o AbortError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const err = await request('/api/x', { auth: false }).catch((e) => e);
    expect(err).toMatchObject({ status: 0 });
    expect(err.message).toMatch(/Sem conexão/);
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    fetchMock.mockRejectedValueOnce(abort);
    expect(await request('/api/x', { auth: false }).catch((e) => e)).toBe(abort);
  });
});

describe('renovação da sessão', () => {
  beforeEach(() => setSession({ accessToken: 'velho', refreshToken: 'ref-1' }));

  it('token expirado (401): renova e repete a chamada com o token novo', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: 'expirou' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'novo', refreshToken: 'ref-2' }))
      .mockResolvedValueOnce(json(200, { dados: 1 }));
    expect(await request('/api/protegida')).toEqual({ dados: 1 });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: 'ref-1' });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer novo');
    expect(getAccessToken()).toBe('novo');
  });

  it('várias chamadas com 401 ao mesmo tempo compartilham UMA renovação (o refresh token é de uso único)', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url === '/api/auth/refresh') return json(200, { accessToken: 'novo', refreshToken: 'ref-2' });
      return init.headers.Authorization === 'Bearer novo' ? json(200, { ok: url }) : json(401, { error: 'expirou' });
    });
    const results = await Promise.all([request('/api/a'), request('/api/b'), request('/api/c')]);
    expect(results.map((r) => r.ok)).toEqual(['/api/a', '/api/b', '/api/c']);
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')).toHaveLength(1);
  });

  it('se a renovação falha, limpa a sessão e avisa o app para voltar ao login', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValueOnce(json(401, { error: 'expirou' })).mockResolvedValueOnce(json(401, { error: 'refresh inválido' }));
    await expect(request('/api/protegida')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(hasSession()).toBe(false);
  });

  it('sem refresh token guardado, o 401 vai direto ao login', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setSession({ accessToken: 'velho' });
    fetchMock.mockResolvedValueOnce(json(401, { error: 'expirou' }));
    await expect(request('/api/protegida')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('sem ninguém escutando, o 401 definitivo também só derruba a sessão', async () => {
    setUnauthorizedHandler(undefined);
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    await expect(request('/api/protegida')).rejects.toMatchObject({ status: 401 });
    expect(hasSession()).toBe(false);
  });

  it('outros erros (403, 404, 500) não disparam renovação; erro de rede na renovação é repassado', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: 'sem permissão' }));
    await expect(request('/api/x')).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(json(401, {})).mockRejectedValueOnce(new TypeError('offline'));
    await expect(request('/api/x')).rejects.toMatchObject({ status: 0 });
    expect(hasSession()).toBe(true); // falha de rede não derruba a sessão
  });

  it('chamadas públicas (auth: false) nunca renovam', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: 'e-mail ou senha inválidos' }));
    await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('mensagens de erro', () => {
  it('une os detalhes de validação; sem detalhes usa a mensagem; sem nada, uma frase padrão', () => {
    expect(errorMessage({ details: [{ message: 'A' }, { message: 'B' }] })).toBe('A · B');
    expect(errorMessage(new Error('falhou'))).toBe('falhou');
    expect(errorMessage(null)).toBe('Algo deu errado.');
  });

  it('erros por campo', () => {
    expect(fieldErrors({ details: [{ field: 'cpf', message: 'CPF inválido.' }, { field: 'address.zip', message: 'CEP inválido.' }] })).toEqual({ cpf: 'CPF inválido.', 'address.zip': 'CEP inválido.' });
    expect(fieldErrors(null)).toEqual({});
  });
});
