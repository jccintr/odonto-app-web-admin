// Textos e regras de apresentação da assinatura (a situação em si vem calculada da API).
import { formatDay } from './dates.js';

export const BILLING_STATE = {
  trial: { label: 'Teste grátis', tone: 'info' },
  active: { label: 'Em dia', tone: 'success' },
  courtesy: { label: 'Cortesia', tone: 'primary' },
  past_due: { label: 'Pagamento em atraso', tone: 'warning' },
  suspended: { label: 'Suspensa', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'danger' },
};

export const pluralDays = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** Aviso fixo no topo do painel: teste acabando, atraso ou vencimento próximo. null = nada a avisar. */
export function bannerFor(status) {
  if (!status) return null;
  const { state, daysLeft, graceEndsOn } = status;
  if (state === 'trial') {
    if (daysLeft === 0) return { tone: 'info', text: 'Hoje é o último dia do seu teste grátis.' };
    return { tone: 'info', text: `Teste grátis: ${daysLeft === 1 ? 'falta 1 dia' : `faltam ${daysLeft} dias`}.` };
  }
  if (state === 'past_due') {
    return { tone: 'warning', text: `Pagamento em atraso há ${pluralDays(-daysLeft)}. Regularize até ${formatDay(graceEndsOn)} para não perder o acesso.` };
  }
  if (state === 'active' && daysLeft <= 5) {
    return { tone: 'info', text: daysLeft === 0 ? 'Sua assinatura vence hoje.' : `Sua assinatura vence em ${pluralDays(daysLeft)}.` };
  }
  return null;
}

export const periodLabel = (invoice) => `${formatDay(invoice.periodStart)} a ${formatDay(invoice.periodEnd)}`;

export function dentistLimitLabel(maxDentists) {
  if (maxDentists === null) return 'Dentistas ilimitados';
  return maxDentists === 1 ? '1 dentista' : `Até ${maxDentists} dentistas`;
}

/** Rotas que continuam abertas com a assinatura suspensa (a API também libera só estas). */
export const OPEN_WHEN_BLOCKED = ['/assinatura', '/conta'];
export const isOpenWhenBlocked = (pathname) => OPEN_WHEN_BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Motivo pelo qual o Pix da fatura não gerou "copia e cola" (veja `pix.reason` da API). */
export const PIX_REASON = {
  PIX_KEY_AMBIGUOUS: 'A chave Pix da plataforma pode ser lida de duas formas. Avise o suporte.',
  PIX_KEY_INVALID: 'A chave Pix da plataforma está inválida. Avise o suporte.',
  PIX_KEY_EMPTY: 'A chave Pix da plataforma não foi configurada. Avise o suporte.',
};
export const pixProblem = (reason) => PIX_REASON[reason] ?? 'Não foi possível gerar o Pix "copia e cola". Use a chave abaixo ou avise o suporte.';

/** Texto do arquivo baixado na exportação: nome com o identificador da clínica e a data. */
export const exportFileName = (clinic, day) => `odontoapp-${clinic.slug}-${day}.json`;
