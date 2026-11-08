import { Procedures } from '../api/index.js';

/** Carrega todos os procedimentos ativos (a API entrega até 100 por página). */
export async function loadActiveProcedures() {
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await Procedures.list({ active: true, perPage: 100, page });
    all.push(...result.data);
    if (page >= result.totalPages) break;
  }
  return all;
}

export const itemLabel = (item) => [item.procedure.name, item.tooth && `dente ${item.tooth}${item.faces ? ` (${item.faces})` : ''}`].filter(Boolean).join(' — ');

/** subtotal dos itens do formulário (centavos) */
export const subtotalOf = (items) => items.reduce((sum, item) => sum + (item.priceCents ?? 0), 0);
