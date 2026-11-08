import { dayOf } from './dates.js';
import { isValidCpf, isValidEmail, isValidPhone, maskCep, maskCpf, maskPhone, onlyDigits } from './masks.js';

export const ANAMNESIS_CONDITIONS = [
  ['diabetes', 'Diabetes'], ['hypertension', 'Hipertensão'], ['heart', 'Problema cardíaco'], ['bleeding', 'Problema de coagulação / sangramento'],
  ['anticoagulant', 'Usa anticoagulante'], ['asthma', 'Asma / problema respiratório'], ['hepatitis', 'Hepatite'], ['hiv', 'HIV'],
  ['epilepsy', 'Epilepsia'], ['kidney', 'Problema renal'],
];

export const EMPTY_FORM = {
  name: '', cpf: '', birthDate: '', phone: '', email: '', zip: '', street: '', number: '', complement: '', district: '', city: '', state: '',
  guardianName: '', guardianPhone: '', notes: '', contactConsent: false,
};

/** paciente da API → estado do formulário (com máscaras) */
export function toForm(p) {
  return {
    name: p.name ?? '', cpf: maskCpf(p.cpf ?? ''), birthDate: p.birthDate ?? '', phone: maskPhone(p.phone ?? ''), email: p.email ?? '',
    zip: maskCep(p.address?.zip ?? ''), street: p.address?.street ?? '', number: p.address?.number ?? '', complement: p.address?.complement ?? '',
    district: p.address?.district ?? '', city: p.address?.city ?? '', state: p.address?.state ?? '',
    guardianName: p.guardianName ?? '', guardianPhone: maskPhone(p.guardianPhone ?? ''), notes: p.notes ?? '', contactConsent: Boolean(p.contactConsent),
  };
}

/** Erros de preenchimento (mensagem por campo). Só valida o que foi preenchido, além do nome. */
export function validatePatient(form, today = dayOf()) {
  const e = {};
  if (form.name.trim().length < 2) e.name = 'Informe o nome do paciente.';
  if (form.cpf && !isValidCpf(form.cpf)) e.cpf = 'CPF inválido.';
  if (form.phone && !isValidPhone(form.phone)) e.phone = 'Telefone inválido (DDD + número).';
  if (form.guardianPhone && !isValidPhone(form.guardianPhone)) e.guardianPhone = 'Telefone inválido (DDD + número).';
  if (form.email && !isValidEmail(form.email)) e.email = 'E-mail inválido.';
  if (form.birthDate && form.birthDate > today) e.birthDate = 'A data de nascimento não pode ser no futuro.';
  if (form.zip && onlyDigits(form.zip).length !== 8) e.zip = 'CEP inválido.';
  if (form.state && !/^[A-Za-z]{2}$/.test(form.state)) e.state = 'Use a sigla (ex.: MG).';
  if (form.contactConsent && !form.email && !form.phone) e.contactConsent = 'Para autorizar contato, informe e-mail ou telefone.';
  return e;
}

/** formulário → corpo da API. Na alteração, campos apagados viram null (a API limpa o valor). */
export function toPayload(form, editing) {
  const text = (v) => (v.trim() === '' ? (editing ? null : undefined) : v.trim());
  const digits = (v) => (onlyDigits(v) === '' ? (editing ? null : undefined) : onlyDigits(v));
  const body = {
    name: form.name.trim(),
    cpf: digits(form.cpf),
    birthDate: text(form.birthDate),
    phone: digits(form.phone),
    email: text(form.email),
    guardianName: text(form.guardianName),
    guardianPhone: digits(form.guardianPhone),
    notes: text(form.notes),
    contactConsent: form.contactConsent,
    address: {
      zip: digits(form.zip), street: text(form.street), number: text(form.number), complement: text(form.complement),
      district: text(form.district), city: text(form.city), state: form.state.trim() === '' ? (editing ? null : undefined) : form.state.trim().toUpperCase(),
    },
  };
  return body;
}

export const emptyAnamnesis = () => ({ allergies: '', medications: '', conditions: [], smoker: false, pregnant: false, notes: '' });
export const readAnamnesis = (raw) => ({ ...emptyAnamnesis(), ...(raw && typeof raw === 'object' ? raw : {}) });
export const conditionLabels = (keys = []) => keys.map((k) => ANAMNESIS_CONDITIONS.find(([id]) => id === k)?.[1] ?? k);
