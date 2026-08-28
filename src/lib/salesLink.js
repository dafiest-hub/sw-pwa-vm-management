/**
 * Enlace venta - ingreso. Lógica pura (sin Supabase) para poder probarla suelta.
 *
 * Contrato del esquema (supabase_db_design.md):
 *  - La clave es (machine_id, tx_id). tx_id es un contador POR MÁQUINA, así que
 *    nunca debe cruzarse sin machine_id.
 *  - La relación es 1:N: un mismo tx_id puede tener varias filas en
 *    sale_incomes (pago mixto).
 *  - tx_id es NULLABLE: ventas anteriores a fw 2.1.0 o capturadas a mano.
 *  - status 'fail' nunca tiene ingreso: no se cobró, el reembolso es implícito.
 *  - Está PROHIBIDO emparejar por proximidad de created_at.
 */

/**
 * tx_id es BIGINT. Normalizar a texto hace la clave inmune a que supabase-js
 * entregue una venta como number y su ingreso como string (o al revés).
 *
 * Salvedad: si un tx_id llegara a superar 2^53, JSON.parse ya habría perdido
 * precisión antes de llegar aquí y ningún cruce en cliente podría arreglarlo.
 * No es un caso realista —es un contador por máquina que arranca en 1— pero
 * conviene tenerlo presente antes de reutilizar esta clave para otra cosa.
 */
export const linkKey = (machineId, txId) => `${machineId}|${String(txId)}`;

export const hasLink = (row) => row?.tx_id !== null && row?.tx_id !== undefined;

const PAYMENT_LABEL = { monedas: 'Monedas', efectivo: 'Efectivo', tarjeta: 'Tarjeta' };

export function summarizePayments(sale, payments) {
  const list = payments || [];
  const methods = [...new Set(list.map((p) => p.payment_type))].sort();
  const amount = list.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const base = { methods, amount, count: list.length, isMixed: false };

  if (sale.status === 'fail') {
    return { ...base, state: 'no_charge', label: 'No cobrada', tone: 'danger' };
  }
  if (!hasLink(sale)) {
    return { ...base, count: 0, state: 'unlinked', label: 'Sin registro', tone: 'neutral' };
  }
  if (!list.length) {
    return { ...base, state: 'missing', label: 'Sin ingreso asociado', tone: 'warn' };
  }
  if (methods.length > 1) {
    return { ...base, isMixed: true, state: 'matched', label: `Mixto (${methods.length})`, tone: 'info' };
  }
  return {
    ...base,
    state: 'matched',
    label: PAYMENT_LABEL[methods[0]] || methods[0],
    tone: 'accent',
  };
}

/** Indexa ingresos por (machine_id, tx_id). */
export function indexIncomes(incomes) {
  const index = new Map();
  for (const inc of incomes || []) {
    const k = linkKey(inc.machine_id, inc.tx_id);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(inc);
  }
  return index;
}

/** Adjunta a cada venta sus ingresos y el resumen del medio de pago. */
export function attachPayments(sales, incomes) {
  const index = indexIncomes(incomes);
  return (sales || []).map((s) => {
    const payments = hasLink(s) ? (index.get(linkKey(s.machine_id, s.tx_id)) || []).slice() : [];
    payments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { ...s, payments, payment_summary: summarizePayments(s, payments) };
  });
}
