// Valores da API vêm em centavos (inteiros). Aqui ficam as conversões para a tela.
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 123456 → "R$ 1.234,56" */
export const formatMoney = (cents) => brl.format((cents ?? 0) / 100).replace(/ /g, ' ');

/**
 * Texto digitado pelo usuário → centavos. Aceita "1.234,56", "1234,5", "1234.56", "R$ 20" e "20".
 * Devolve null se não for um valor válido (vazio, letras, negativo, milhares fora de lugar).
 */
export function parseMoney(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).replace(/R\$|\s/g, '');
  if (s === '' || /[^0-9.,]/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let integer = s;
  let decimals = '';
  let thousands = null;
  if (lastComma > -1 && lastDot > -1) {
    // o último dos dois é o separador decimal; o outro separa milhares
    const decimalAt = Math.max(lastComma, lastDot);
    thousands = decimalAt === lastComma ? '.' : ',';
    integer = s.slice(0, decimalAt);
    decimals = s.slice(decimalAt + 1);
  } else if (lastComma > -1) {
    integer = s.slice(0, lastComma);
    decimals = s.slice(lastComma + 1);
  } else if (lastDot > -1) {
    const after = s.length - lastDot - 1;
    if (s.indexOf('.') === lastDot && after !== 3) { integer = s.slice(0, lastDot); decimals = s.slice(lastDot + 1); } // "1234.56"
    else thousands = '.'; // "1.234" ou "1.000.000": ponto separa milhares
  }

  if (thousands) {
    if (!new RegExp(`^\\d{1,3}(\\${thousands}\\d{3})+$`).test(integer)) return null;
    integer = integer.split(thousands).join('');
  }
  if (!/^\d+$/.test(integer) || !/^\d{1,2}$|^$/.test(decimals) || (decimals === '' && /[.,]$/.test(s))) return null;
  return Number(integer) * 100 + Number(decimals.padEnd(2, '0'));
}

/** centavos → texto editável ("1234,50") para preencher campos de formulário */
export const centsToInput = (cents) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ','));
