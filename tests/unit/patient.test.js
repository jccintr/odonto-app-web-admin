import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, conditionLabels, emptyAnamnesis, readAnamnesis, toForm, toPayload, validatePatient } from '../../src/lib/patient.js';

const ok = { ...EMPTY_FORM, name: 'Ana Lima' };

describe('validatePatient', () => {
  it('só o nome é obrigatório', () => {
    expect(validatePatient(ok)).toEqual({});
    expect(validatePatient({ ...ok, name: ' A ' }).name).toBeTruthy();
  });

  it('valida o que foi preenchido', () => {
    const e = validatePatient({ ...ok, cpf: '111.111.111-11', phone: '123', guardianPhone: '12', email: 'x', birthDate: '2099-01-01', zip: '123', state: 'MGX' }, '2026-11-01');
    expect(Object.keys(e).sort()).toEqual(['birthDate', 'cpf', 'email', 'guardianPhone', 'phone', 'state', 'zip']);
    expect(validatePatient({ ...ok, cpf: '529.982.247-25', phone: '(35) 99999-0000', email: 'a@b.co', birthDate: '2000-01-01', zip: '37530-000', state: 'mg' })).toEqual({});
  });

  it('autorizar contato exige e-mail ou telefone', () => {
    expect(validatePatient({ ...ok, contactConsent: true }).contactConsent).toBeTruthy();
    expect(validatePatient({ ...ok, contactConsent: true, email: 'a@b.co' })).toEqual({});
    expect(validatePatient({ ...ok, contactConsent: true, phone: '35999990000' })).toEqual({});
  });
});

describe('toPayload', () => {
  const full = { ...ok, cpf: '529.982.247-25', phone: '(35) 99999-0000', email: ' a@b.co ', birthDate: '1990-05-17', zip: '37530-000', street: 'Rua A', state: 'mg', notes: ' obs ', contactConsent: true, guardianPhone: '(35) 3333-4444' };

  it('no cadastro, campos vazios são omitidos e os preenchidos vão limpos', () => {
    expect(toPayload(ok, false)).toEqual({
      name: 'Ana Lima', cpf: undefined, birthDate: undefined, phone: undefined, email: undefined, guardianName: undefined, guardianPhone: undefined, notes: undefined,
      contactConsent: false, address: { zip: undefined, street: undefined, number: undefined, complement: undefined, district: undefined, city: undefined, state: undefined },
    });
    const body = toPayload(full, false);
    expect(body).toMatchObject({ cpf: '52998224725', phone: '35999990000', email: 'a@b.co', notes: 'obs', guardianPhone: '3533334444', address: { zip: '37530000', street: 'Rua A', state: 'MG' } });
  });

  it('na alteração, campos apagados viram null para a API limpar', () => {
    const body = toPayload(ok, true);
    expect(body.cpf).toBeNull();
    expect(body.email).toBeNull();
    expect(body.address.state).toBeNull();
    expect(body.address.zip).toBeNull();
  });
});

describe('toForm e anamnese', () => {
  it('paciente da API vira formulário com máscaras', () => {
    expect(toForm({ name: 'Ana', cpf: '52998224725', phone: '35999990000', address: { zip: '37530000', city: 'Brazópolis', state: 'MG' }, contactConsent: true })).toMatchObject({
      name: 'Ana', cpf: '529.982.247-25', phone: '(35) 99999-0000', zip: '37530-000', city: 'Brazópolis', state: 'MG', contactConsent: true, email: '', notes: '',
    });
    expect(toForm({ name: 'Sem endereço' }).street).toBe('');
  });

  it('anamnese tolera dados antigos ou vazios', () => {
    expect(readAnamnesis(null)).toEqual(emptyAnamnesis());
    expect(readAnamnesis({ allergies: 'látex' })).toEqual({ ...emptyAnamnesis(), allergies: 'látex' });
    expect(readAnamnesis('texto')).toEqual(emptyAnamnesis());
    expect(conditionLabels(['diabetes', 'desconhecida'])).toEqual(['Diabetes', 'desconhecida']);
    expect(conditionLabels()).toEqual([]);
  });
});
