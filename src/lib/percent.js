/** "12,5" → 12.5. Devolve null se não for um percentual de 0 a 100 com até 2 casas. */
export function parsePercent(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 && n <= 100 ? n : null;
}
export const formatPercent = (n) => `${String(n).replace('.', ',')}%`;
