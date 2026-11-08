// Em desenvolvimento VITE_API_URL fica vazio e o Vite faz proxy de /api. Em produção aponte para a API.
/* v8 ignore next -- o ramo "sem .env" depende do ambiente de build */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const ACCESS_KEY = 'odonto:access';
const REFRESH_KEY = 'odonto:refresh';

export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = extra.code;
    this.details = extra.details;
    this.retryAfterSeconds = extra.retryAfterSeconds;
    this.extra = extra;
  }
}

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* sem armazenamento: a sessão dura só até recarregar */ } };

export const getAccessToken = () => read(ACCESS_KEY);
export const hasSession = () => Boolean(read(ACCESS_KEY) || read(REFRESH_KEY));
export const setSession = (session) => { write(ACCESS_KEY, session?.accessToken ?? null); write(REFRESH_KEY, session?.refreshToken ?? null); };

let onUnauthorized;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// assinatura suspensa (402): quem usa o app é avisado para mostrar a tela de regularização, mesmo no meio da sessão
let onSuspended;
export const setSuspendedHandler = (fn) => { onSuspended = fn; };

const queryString = (query) => {
  const entries = Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

async function send(path, { method = 'GET', body, query, signal, token }) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}${queryString(query)}`, { method, headers, signal, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 402 && data?.code === 'SUBSCRIPTION_SUSPENDED') onSuspended?.();
    throw new ApiError(res.status, data?.error ?? 'Não foi possível concluir a operação.', data ?? {});
  }
  return data;
}

// Renovação da sessão: várias chamadas que recebem 401 ao mesmo tempo compartilham UMA renovação
// (o refresh token é de uso único, então duas renovações simultâneas derrubariam a sessão).
let refreshing = null;
function refreshSession() {
  refreshing ??= (async () => {
    const refreshToken = read(REFRESH_KEY);
    if (!refreshToken) throw new ApiError(401, 'Sessão expirada.');
    const session = await send('/api/auth/refresh', { method: 'POST', body: { refreshToken } });
    setSession(session);
    return session;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/** Chamada à API. Com `auth` (padrão) envia o token e, se ele expirou (401), renova a sessão e repete a chamada uma vez. */
export async function request(path, { auth = true, ...options } = {}) {
  if (!auth) return send(path, options);
  try {
    return await send(path, { ...options, token: getAccessToken() });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    try {
      const session = await refreshSession();
      return await send(path, { ...options, token: session.accessToken });
    } catch (second) {
      if (second instanceof ApiError && second.status === 401) { setSession(null); onUnauthorized?.(); }
      throw second;
    }
  }
}

/** mensagem amigável: erros de validação (400 com details) viram uma frase só */
export function errorMessage(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' · ');
  return err?.message ?? 'Algo deu errado.';
}

/** erros de campo da API ({ details: [{ field, message }] }) → { campo: mensagem } */
export function fieldErrors(err) {
  return Object.fromEntries((err?.details ?? []).map((d) => [d.field, d.message]));
}
