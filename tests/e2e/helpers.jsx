import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { inject } from 'vitest';
import { setSession } from '../../src/api/client.js';
import App from '../../src/App.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { UIProvider } from '../../src/context/UIContext.jsx';

export const demo = () => inject('demo');
export const user = () => userEvent.setup();

/** Desenha o app inteiro na rota `path`. */
export function renderApp(path = '/') {
  cleanup(); // um app por vez: renderizar de novo (outra tela) substitui o anterior
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></ThemeProvider>
    </MemoryRouter>,
  );
}

/** Entra pela API (sem passar pela tela) e guarda a sessão, como se o usuário já tivesse feito login. */
export async function loginAs(who = 'admin') {
  const account = who === 'admin' ? demo().admin : who === 'secretary' ? demo().secretary : demo().dentists[0];
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password }) });
  if (res.status !== 200) throw new Error(`login de teste falhou: ${res.status}`);
  setSession(await res.json());
  return account;
}

let counter = 0;
export const unique = (prefix) => `${prefix} ${Date.now().toString(36)}${++counter}`;

export { screen, waitFor, within };

/** Chamada direta à API com a sessão atual (para montar o cenário sem passar pela tela). */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('odonto:access')}` }, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// cada arquivo de teste roda em paralelo contra o mesmo servidor: começa de um ponto aleatório para os horários não colidirem
let slot = Math.floor(Math.random() * 40_000);
/**
 * Executa itens do orçamento do jeito real (a baixa só existe dentro do atendimento): a secretária marca, o dentista inicia e conclui.
 * Termina com a sessão de volta no perfil `back` (padrão: administração).
 */
export async function executeItems({ budget, patientId, dentistId, itemIds, back = 'admin' }) {
  await loginAs('secretary');
  const start = new Date(Date.UTC(2093, 0, 1) + (slot += 1) * 3_600_000);
  const appointment = await api('/api/appointments', { method: 'POST', body: { patientId, dentistId, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 1_800_000).toISOString() } });
  const items = (await api(`/api/budgets/${budget.id}`)).items.filter((i) => itemIds.includes(i.id));
  await loginAs('dentist');
  await api(`/api/appointments/${appointment.id}/status`, { method: 'POST', body: { status: 'in_progress' } });
  await api(`/api/appointments/${appointment.id}/status`, { method: 'POST', body: { status: 'attended', evolution: { budgetItems: items.map((i) => (i.tooth ? { itemId: i.id } : { itemId: i.id, wholeMouth: true })) } } });
  await loginAs(back);
}

/** Paciente + orçamento aprovado de um procedimento; devolve ids. Útil para repasse, relatórios e odontograma. */
export async function seedBudget({ procedure = 'Restauração em resina', tooth } = {}) {
  const patient = await api('/api/patients', { method: 'POST', body: { name: unique('Paciente de cenário'), contactConsent: false } });
  const dentists = await api('/api/dentists');
  const procedures = await api('/api/procedures?perPage=100');
  const proc = procedures.data.find((p) => p.name === procedure);
  const budget = await api('/api/budgets', { method: 'POST', body: { patientId: patient.id, dentistId: dentists[0].id, items: [{ procedureId: proc.id, tooth }] } });
  const approved = await api(`/api/budgets/${budget.id}/status`, { method: 'POST', body: { status: 'approved' } });
  return { patient, dentist: dentists[0], budget: approved, item: approved.items[0] };
}
