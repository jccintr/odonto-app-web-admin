import { describe, expect, it, vi } from 'vitest';

const Procedures = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../src/api/index.js', () => ({ Procedures }));
import { addDays, ageOf, dayOf, formatDateTime, formatDay, formatDayLong, formatMonth, monthOf, shiftMonth, timeOf, toIso, weekStart, weekdayShort } from '../../src/lib/dates.js';
import { isValidCpf, isValidEmail, isValidPhone, maskCep, maskCpf, maskPhone, onlyDigits } from '../../src/lib/masks.js';
import { centsToInput, formatMoney, parseMoney } from '../../src/lib/money.js';
import { formatPercent, parsePercent } from '../../src/lib/percent.js';
import { ALL_TEETH, UPPER_PERMANENT, isDeciduous, isTooth, normalizeFaces, toothLabel } from '../../src/lib/tooth.js';
import { itemLabel, loadActiveProcedures } from '../../src/lib/budget.js';

describe('dinheiro', () => {
  it('formata centavos em reais, sem espaço especial', () => {
    expect(formatMoney(123456)).toBe('R$ 1.234,56');
    expect(formatMoney(0)).toBe('R$ 0,00');
    expect(formatMoney(undefined)).toBe('R$ 0,00');
    expect(formatMoney(5)).toBe('R$ 0,05');
  });

  it.each([
    ['1.234,56', 123456], ['1234,5', 123450], ['1234.56', 123456], ['R$ 20', 2000], ['20', 2000], ['0,99', 99], ['1.234', 123400], ['1,234.56', 123456],
    ['12,5', 1250], ['  7 ', 700], ['0', 0], ['1.000.000,00', 100000000],
  ])('interpreta "%s" como %i centavos', (text, cents) => {
    expect(parseMoney(text)).toBe(cents);
  });

  it.each([[''], ['abc'], ['12,345'], ['-5'], ['1,2,3'], [null], [undefined], ['R$'], ['1.2.3,4'], ['12,'], ['1.2345'], ['.5,'], ['1.23.456']])('recusa "%s"', (text) => {
    expect(parseMoney(text)).toBeNull();
  });

  it('centavos viram texto editável', () => {
    expect(centsToInput(123450)).toBe('1234,50');
    expect(centsToInput(0)).toBe('0,00');
    expect(centsToInput(null)).toBe('');
    expect(centsToInput(undefined)).toBe('');
  });
});

describe('datas (fuso de Brasília)', () => {
  it('o dia e a hora seguem Brasília, não o UTC', () => {
    expect(dayOf('2026-11-07T02:15:00Z')).toBe('2026-11-06');
    expect(timeOf('2026-11-07T02:15:00Z')).toBe('23:15');
    expect(dayOf(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDateTime('2026-11-06T17:30:00Z')).toBe('06/11/2026 às 14:30');
    expect(formatDateTime(null)).toBe('');
  });

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('a semana começa na segunda-feira', () => {
    expect(weekStart('2026-11-02')).toBe('2026-11-02'); // segunda
    expect(weekStart('2026-11-05')).toBe('2026-11-02'); // quinta
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // domingo
  });

  it('formatações em português', () => {
    expect(formatDay('2026-11-06')).toBe('06/11/2026');
    expect(formatDay(null)).toBe('');
    expect(formatDayLong('2026-11-06')).toBe('sexta-feira, 6 de novembro');
    expect(weekdayShort('2026-11-06')).toBe('sex');
    expect(formatMonth('2026-03')).toBe('Março de 2026');
  });

  it('data e hora de Brasília viram instante com fuso', () => {
    expect(toIso('2026-11-06', '14:30')).toBe('2026-11-06T14:30:00-03:00');
    expect(new Date(toIso('2026-11-06', '14:30')).toISOString()).toBe('2026-11-06T17:30:00.000Z');
  });

  it('idade em anos completos', () => {
    expect(ageOf('1990-05-17', '2026-05-16')).toBe(35);
    expect(ageOf('1990-05-17', '2026-05-17')).toBe(36);
    expect(ageOf('1990-05-17', '2026-06-01')).toBe(36);
    expect(ageOf('1990-12-31', '2026-01-01')).toBe(35);
    expect(ageOf(null)).toBeNull();
  });

  it('meses', () => {
    expect(monthOf('2026-11-06')).toBe('2026-11');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthOf()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('máscaras e validações', () => {
  it('aplicam a máscara enquanto digita', () => {
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('529')).toBe('529');
    expect(maskCpf('5299')).toBe('529.9');
    expect(maskCpf('529982247259999')).toBe('529.982.247-25');
    expect(maskPhone('35')).toBe('35');
    expect(maskPhone('359999')).toBe('(35) 9999');
    expect(maskPhone('3533334444')).toBe('(35) 3333-4444');
    expect(maskPhone('35999990000')).toBe('(35) 99999-0000');
    expect(maskCep('37530000')).toBe('37530-000');
    expect(maskCep('375')).toBe('375');
    expect(onlyDigits('(35) 9-9999')).toBe('3599999');
    expect(onlyDigits(null)).toBe('');
  });

  it('CPF confere os dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224726')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('telefone e e-mail', () => {
    expect(isValidPhone('(35) 99999-0000')).toBe(true);
    expect(isValidPhone('3533334444')).toBe(true);
    expect(isValidPhone('359999')).toBe(false);
    expect(isValidEmail('ana@exemplo.com')).toBe(true);
    expect(isValidEmail('ana@exemplo')).toBe(false);
    expect(isValidEmail(' ana @x.com')).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('percentual', () => {
  it('aceita vírgula ou ponto, 0 a 100, até 2 casas', () => {
    expect(parsePercent('12,5')).toBe(12.5);
    expect(parsePercent('100')).toBe(100);
    expect(parsePercent('0')).toBe(0);
    expect(parsePercent(' 33.33 ')).toBe(33.33);
    for (const bad of ['', 'abc', '101', '-1', '1,234', null]) expect(parsePercent(bad), String(bad)).toBeNull();
    expect(formatPercent(12.5)).toBe('12,5%');
  });
});

describe('dentes (FDI)', () => {
  it('conhece os 52 dentes e separa os de leite', () => {
    expect(ALL_TEETH).toHaveLength(52);
    expect(isTooth(16)).toBe(true);
    expect(isTooth('55')).toBe(true);
    expect(isTooth(19)).toBe(false);
    expect(isTooth(56)).toBe(false);
    expect(isDeciduous(55)).toBe(true);
    expect(isDeciduous(16)).toBe(false);
  });

  it('o arco superior vai do 18 ao 11 e do 21 ao 28 (paciente de frente)', () => {
    expect(UPPER_PERMANENT.slice(0, 2)).toEqual([18, 17]);
    expect(UPPER_PERMANENT.slice(7, 9)).toEqual([11, 21]);
  });

  it('faces na ordem canônica da API', () => {
    expect(normalizeFaces('OD')).toBe('DO');
    expect(normalizeFaces('vlmdo')).toBe('VLMDO');
    expect(normalizeFaces('xyz')).toBe('');
    expect(normalizeFaces(null)).toBe('');
    expect(toothLabel(16)).toBe('Dente 16 — superior direito');
    expect(toothLabel(75)).toBe('Dente 75 — inferior esquerdo (leite)');
  });
});

describe('orçamento', () => {
  it('rótulo do item e subtotal do formulário', () => {
    expect(itemLabel({ procedure: { name: 'Restauração' }, tooth: 16, faces: 'DO' })).toBe('Restauração — dente 16 (DO)');
    expect(itemLabel({ procedure: { name: 'Limpeza' }, tooth: null, faces: null })).toBe('Limpeza');
    expect(itemLabel({ procedure: { name: 'Canal' }, tooth: 11, faces: null })).toBe('Canal — dente 11');
  });
});

describe('loadActiveProcedures', () => {
  it('junta todas as páginas de procedimentos ativos', async () => {
    Procedures.list
      .mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b' }], totalPages: 2 })
      .mockResolvedValueOnce({ data: [{ id: 'c' }], totalPages: 2 });
    expect((await loadActiveProcedures()).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(Procedures.list).toHaveBeenNthCalledWith(1, { active: true, perPage: 100, page: 1 });
    expect(Procedures.list).toHaveBeenNthCalledWith(2, { active: true, perPage: 100, page: 2 });
  });

  it('uma página só: uma chamada só', async () => {
    Procedures.list.mockReset().mockResolvedValue({ data: [{ id: 'a' }], totalPages: 1 });
    expect(await loadActiveProcedures()).toHaveLength(1);
    expect(Procedures.list).toHaveBeenCalledTimes(1);
  });
});
