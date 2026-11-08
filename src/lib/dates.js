// Datas "de calendário" no fuso de Brasília, igual à API (TIMEZONE=America/Sao_Paulo).
export const TZ = 'America/Sao_Paulo';
const pad = (n) => String(n).padStart(2, '0');

/** 'AAAA-MM-DD' de um instante, no fuso de Brasília */
export const dayOf = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

/** 'HH:MM' de um instante, no fuso de Brasília */
export const timeOf = (date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(date));

/** Soma dias a 'AAAA-MM-DD'. */
export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Segunda-feira da semana de um dia 'AAAA-MM-DD'. */
export function weekStart(day) {
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/** 'AAAA-MM-DD' → '06/11/2026' */
export const formatDay = (day) => (day ? day.split('-').reverse().join('/') : '');

/** 'AAAA-MM-DD' → 'sexta-feira, 6 de novembro' */
export function formatDayLong(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** 'AAAA-MM-DD' → 'sex' */
export function weekdayShort(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' }).format(new Date(Date.UTC(y, m - 1, d))).replace('.', '');
}

/** instante → '06/11/2026 às 14:30' (Brasília) */
export const formatDateTime = (date) => (date ? `${formatDay(dayOf(date))} às ${timeOf(date)}` : '');

/** 'AAAA-MM-DD' + 'HH:MM' (hora de Brasília) → ISO com fuso, para enviar à API. Brasília é UTC-03:00 o ano todo (sem horário de verão desde 2019). */
export const toIso = (day, time) => `${day}T${time}:00-03:00`;

/** Idade em anos completos a partir de 'AAAA-MM-DD' */
export function ageOf(birthDay, today = dayOf()) {
  if (!birthDay) return null;
  const [by, bm, bd] = birthDay.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** 'AAAA-MM' do mês atual / anterior / seguinte */
export const monthOf = (day = dayOf()) => day.slice(0, 7);
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}
export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const text = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
