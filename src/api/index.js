// Uma função por rota da API (ver /docs na API). Tudo devolve o JSON da resposta.
import { request } from './client.js';

const get = (path, query, extra) => request(path, { query, ...extra });
const send = (method) => (path, body) => request(path, { method, body: body ?? {} });
const post = send('POST');
const patch = send('PATCH');
const del = (path) => request(path, { method: 'DELETE' });

export const Auth = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  logout: (refreshToken) => request('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  me: () => get('/api/auth/me'),
  verifyEmail: (token) => request('/api/auth/verify-email', { method: 'POST', body: { token }, auth: false }),
  resendVerification: (email) => request('/api/auth/resend-verification', { method: 'POST', body: { email }, auth: false }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, newPassword) => request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false }),
  changePassword: (currentPassword, newPassword) => post('/api/auth/change-password', { currentPassword, newPassword }),
};

export const Clinic = {
  get: () => get('/api/clinic'),
  update: (body) => patch('/api/clinic', body),
  onboarding: () => get('/api/clinic/onboarding'),
  pricesReviewed: () => post('/api/clinic/onboarding/prices-reviewed'),
};

// cadastro público e textos legais (sem login)
export const Signup = {
  options: () => request('/api/signup/options', { auth: false }),
  create: (body) => request('/api/signup', { method: 'POST', body, auth: false }),
  legal: (type) => request(`/api/legal/${type}`, { auth: false }),
};

export const Billing = {
  status: () => get('/api/billing/status'),
  get: () => get('/api/billing'),
  choosePlan: (planId) => post('/api/billing/plan', { planId }),
  reportPaid: (invoiceId, note) => post(`/api/billing/invoices/${invoiceId}/reported`, note ? { note } : {}),
};

// LGPD: exportar os dados e pedir a exclusão da conta
export const Account = {
  export: () => get('/api/account/export'),
  requestDeletion: (password) => post('/api/account/deletion-request', { password }),
  cancelDeletion: () => del('/api/account/deletion-request'),
};

export const Users = {
  list: (query) => get('/api/users', query),
  create: (body) => post('/api/users', body),
  update: (id, body) => patch(`/api/users/${id}`, body),
};

export const Dentists = {
  list: (query) => get('/api/dentists', query),
  update: (id, body) => patch(`/api/dentists/${id}`, body),
};

export const Procedures = {
  list: (query) => get('/api/procedures', query),
  create: (body) => post('/api/procedures', body),
  update: (id, body) => patch(`/api/procedures/${id}`, body),
};

export const Patients = {
  list: (query) => get('/api/patients', query),
  get: (id) => get(`/api/patients/${id}`),
  create: (body) => post('/api/patients', body),
  update: (id, body) => patch(`/api/patients/${id}`, body),
  standing: (id) => get(`/api/patients/${id}/standing`),
  releaseBlock: (id, body) => post(`/api/patients/${id}/block-release`, body),
  odontogram: (id) => get(`/api/patients/${id}/odontogram`),
  mark: (id, body) => post(`/api/patients/${id}/odontogram`, body),
  unmark: (id, recordId) => del(`/api/patients/${id}/odontogram/${recordId}`),
};

export const Evolutions = {
  list: (patientId, query) => get(`/api/patients/${patientId}/evolutions`, query),
};

export const Images = {
  list: (patientId, query) => get(`/api/patients/${patientId}/images`, query),
  sign: (patientId) => post(`/api/patients/${patientId}/images/upload-signature`),
  register: (patientId, body) => post(`/api/patients/${patientId}/images`, body),
  update: (patientId, id, body) => patch(`/api/patients/${patientId}/images/${id}`, body),
  remove: (patientId, id) => del(`/api/patients/${patientId}/images/${id}`),
};

export const Appointments = {
  list: (query) => get('/api/appointments', query),
  create: (body) => post('/api/appointments', body),
  update: (id, body) => patch(`/api/appointments/${id}`, body),
  setStatus: (id, status, reason) => post(`/api/appointments/${id}/status`, reason ? { status, reason } : { status }),
};

export const Budgets = {
  list: (query) => get('/api/budgets', query),
  get: (id) => get(`/api/budgets/${id}`),
  create: (body) => post('/api/budgets', body),
  update: (id, body) => patch(`/api/budgets/${id}`, body),
  setStatus: (id, status) => post(`/api/budgets/${id}/status`, { status }),
  approve: (id, body) => post(`/api/budgets/${id}/approvals`, body),
  addItem: (id, body) => post(`/api/budgets/${id}/items`, body),
  updateItem: (id, itemId, body) => patch(`/api/budgets/${id}/items/${itemId}`, body),
  removeItem: (id, itemId) => del(`/api/budgets/${id}/items/${itemId}`),
  cancelItem: (id, itemId) => post(`/api/budgets/${id}/items/${itemId}/cancel`),
  payments: (id) => get(`/api/budgets/${id}/payments`),
  addPayment: (id, body) => post(`/api/budgets/${id}/payments`, body),
  plan: (id, body) => post(`/api/budgets/${id}/payment-plan`, body),
};

export const Worklist = { get: () => get('/api/worklist') };

export const Payments = {
  list: (query) => get('/api/payments', query),
  update: (id, body) => patch(`/api/payments/${id}`, body),
  pay: (id, body) => post(`/api/payments/${id}/pay`, body),
  cancel: (id, reason) => post(`/api/payments/${id}/cancel`, reason ? { reason } : {}),
};

export const Payouts = {
  settings: () => get('/api/payouts/settings'),
  updateSettings: (body) => patch('/api/payouts/settings', body),
  rules: (query) => get('/api/payouts/rules', query),
  createRule: (body) => post('/api/payouts/rules', body),
  updateRule: (id, body) => patch(`/api/payouts/rules/${id}`, body),
  removeRule: (id) => del(`/api/payouts/rules/${id}`),
  resolve: (query) => get('/api/payouts/rules/resolve', query),
  entries: (query) => get('/api/payouts/entries', query),
  balances: (query) => get('/api/payouts/balances', query),
  list: (query) => get('/api/payouts', query),
  get: (id) => get(`/api/payouts/${id}`),
  pay: (body) => post('/api/payouts', body),
  cancel: (id, reason) => post(`/api/payouts/${id}/cancel`, reason ? { reason } : {}),
};

export const Reports = {
  monthly: (month) => get('/api/reports/monthly', { month }),
  trend: (month, months) => get('/api/reports/trend', { month, months }),
};

export const Notices = {
  settings: () => get('/api/notifications/settings'),
  updateSettings: (body) => patch('/api/notifications/settings', body),
  list: (query) => get('/api/notifications', query),
  reminder: (appointmentId) => post(`/api/notifications/appointments/${appointmentId}/reminder`),
  appointmentWhatsapp: (appointmentId) => get(`/api/notifications/appointments/${appointmentId}/whatsapp`),
  budgetEmail: (budgetId) => post(`/api/notifications/budgets/${budgetId}/email`),
  budgetWhatsapp: (budgetId) => get(`/api/notifications/budgets/${budgetId}/whatsapp`),
  run: () => post('/api/notifications/reminders/run'),
};
