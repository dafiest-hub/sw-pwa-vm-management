import { query, chunk, IS_DEMO } from '../lib/dataAccess';
import { linkKey, hasLink, summarizePayments } from '../lib/salesLink';
import { supabase } from '../lib/supabaseClient';
import { applyCommonFilters, applyPaging, defaultRange } from './_filters';
import { sampleSales, sampleSaleIncomes } from '../mock/sampleData';
import { PAYMENT_TYPES } from '../lib/format';

const SALE_SELECT = '*, product:products (id, sku, name), machine:machines (id, name, device_id)';
const INCOME_SELECT = '*, machine:machines (id, name, device_id)';

/** Predicado compartido con la rama Supabase, para que el demo no mienta. */
function matchesFilters(row, filters = {}, { productAware = true } = {}) {
  const { machineIds, productId, from, to, status } = filters;
  if (Array.isArray(machineIds) && machineIds.length && !machineIds.includes(row.machine_id)) return false;
  if (productAware && productId && row.product_id !== productId) return false;
  if (status && row.status !== status) return false;
  if (from && new Date(row.created_at) < new Date(from)) return false;
  if (to && new Date(row.created_at) > new Date(to)) return false;
  return true;
}

const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

// ─────────────────────────────────────────────────────────────────────────────
// Lecturas base
// ─────────────────────────────────────────────────────────────────────────────

export async function getSales(filters = {}) {
  return query(
    'sales.getSales',
    (sb) => {
      let q = sb.from('sales').select(SALE_SELECT);
      q = applyCommonFilters(q, filters);
      if (filters.status) q = q.eq('status', filters.status);
      return applyPaging(q.order('created_at', { ascending: false }), filters);
    },
    () => sampleSales.filter((s) => matchesFilters(s, filters)).sort(byDateDesc)
  );
}

/**
 * sale_incomes NO tiene product_id: filtrar por producto aquí devolvería vacío.
 */
export async function getSaleIncomes(filters = {}) {
  const { productId, status, ...rest } = filters;
  return query(
    'sales.getSaleIncomes',
    (sb) => {
      let q = sb.from('sale_incomes').select(INCOME_SELECT);
      q = applyCommonFilters(q, rest);
      return applyPaging(q.order('created_at', { ascending: false }), filters);
    },
    () => sampleSaleIncomes.filter((i) => matchesFilters(i, rest, { productAware: false })).sort(byDateDesc)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EL FIX: ventas con su medio de pago
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve UNA FILA POR VENTA con sus ingresos adjuntos.
 *
 * PostgREST no puede resolver este join: no hay FK entre sales y sale_incomes.
 * Se hace en dos consultas y se cruza por (machine_id, tx_id) — nunca por
 * proximidad de created_at, porque el webhook procesa `income` y `sale` en
 * invocaciones concurrentes y el orden de inserción no está garantizado.
 */
export async function getSalesWithPayments(filters = {}) {
  const sales = await getSales(filters);

  const linked = sales.filter(hasLink);
  const txIds = [...new Set(linked.map((s) => s.tx_id))];
  const machineIds = [...new Set(linked.map((s) => s.machine_id))];

  let incomes = [];
  if (txIds.length) {
    if (IS_DEMO()) {
      incomes = sampleSaleIncomes.filter(
        (i) => txIds.includes(i.tx_id) && machineIds.includes(i.machine_id)
      );
    } else {
      for (const lote of chunk(txIds, 200)) {
        const { data, error } = await supabase
          .from('sale_incomes')
          .select('id, machine_id, tx_id, payment_type, amount, created_at')
          .in('tx_id', lote)
          .in('machine_id', machineIds);
        if (error) {
          console.error(`[sales.getSalesWithPayments] ${error.code} — ${error.message}`);
          throw error;
        }
        incomes.push(...(data || []));
      }
    }
  }

  // El doble .in() es un producto cartesiano y puede traer ingresos de otra
  // máquina con el mismo tx_id. La clave incluye machine_id, así que esos
  // simplemente nunca se adjuntan y jamás entran en los totales.
  const index = new Map();
  for (const inc of incomes) {
    const k = linkKey(inc.machine_id, inc.tx_id);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(inc);
  }

  return sales.map((s) => {
    const payments = hasLink(s)
      ? (index.get(linkKey(s.machine_id, s.tx_id)) || []).slice().sort(byDateDesc)
      : [];
    return { ...s, payments, payment_summary: summarizePayments(s, payments) };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Agregados de negocio
// ─────────────────────────────────────────────────────────────────────────────

const emptyByPaymentType = () => ({
  ...Object.fromEntries(PAYMENT_TYPES.map((t) => [t, 0])),
  otros: 0,
});

/**
 * El dinero SIEMPRE se cuenta desde sale_incomes: una venta fallida tiene
 * price_paid pero no se cobró, y sumar price_paid inflaría los ingresos.
 */
export async function getFinancialSummary(filters = {}) {
  const range = filters.from || filters.to ? filters : { ...filters, ...defaultRange(30) };

  const [sales, incomes] = await Promise.all([
    getSales({ ...range, pageSize: 1000 }),
    getSaleIncomes({ ...range, pageSize: 1000 }),
  ]);

  const byPaymentType = emptyByPaymentType();
  let totalIncome = 0;
  for (const i of incomes) {
    const amount = Number(i.amount || 0);
    totalIncome += amount;
    if (i.payment_type in byPaymentType) byPaymentType[i.payment_type] += amount;
    else byPaymentType.otros += amount;
  }

  const ok = sales.filter((s) => s.status === 'success');
  const totalLiters = ok.reduce((a, s) => a + Number(s.liters_purchased || 0), 0);
  const totalRevenue = ok.reduce((a, s) => a + Number(s.price_paid || 0), 0);

  return {
    totalIncome,
    byPaymentType,
    totalLiters,
    totalRevenue,
    totalSalesCount: sales.length,
    successSalesCount: ok.length,
    failedSalesCount: sales.length - ok.length,
    avgTicket: ok.length ? totalRevenue / ok.length : 0,
  };
}

/** Sustituye al "consumo de producto" global: el negocio lo necesita por máquina. */
export async function getConsumptionByMachine(filters = {}) {
  const range = filters.from || filters.to ? filters : { ...filters, ...defaultRange(30) };
  const [sales, incomes] = await Promise.all([
    getSales({ ...range, pageSize: 1000 }),
    getSaleIncomes({ ...range, pageSize: 1000 }),
  ]);

  const acc = new Map();
  const slot = (id, machine) => {
    if (!acc.has(id)) {
      acc.set(id, {
        machine_id: id,
        name: machine?.name || 'Máquina',
        device_id: machine?.device_id || '',
        liters: 0,
        revenue: 0,
        income: 0,
        salesOk: 0,
        salesFailed: 0,
      });
    }
    return acc.get(id);
  };

  for (const s of sales) {
    const row = slot(s.machine_id, s.machine);
    if (s.status === 'success') {
      row.salesOk += 1;
      row.liters += Number(s.liters_purchased || 0);
      row.revenue += Number(s.price_paid || 0);
    } else {
      row.salesFailed += 1;
    }
  }
  for (const i of incomes) slot(i.machine_id, i.machine).income += Number(i.amount || 0);

  return [...acc.values()]
    .map((r) => ({ ...r, avgTicket: r.salesOk ? r.revenue / r.salesOk : 0 }))
    .sort((a, b) => b.liters - a.liters);
}

/** Consumo por producto, para el detalle de una máquina. */
export async function getConsumptionByProduct(filters = {}) {
  const range = filters.from || filters.to ? filters : { ...filters, ...defaultRange(30) };
  const sales = await getSales({ ...range, status: 'success', pageSize: 1000 });

  const acc = new Map();
  for (const s of sales) {
    const key = s.product_id || 'sin-producto';
    if (!acc.has(key)) {
      acc.set(key, { product_id: s.product_id, name: s.product?.name || 'Sin producto', sku: s.product?.sku || '', liters: 0, revenue: 0, count: 0 });
    }
    const row = acc.get(key);
    row.liters += Number(s.liters_purchased || 0);
    row.revenue += Number(s.price_paid || 0);
    row.count += 1;
  }
  return [...acc.values()].sort((a, b) => b.liters - a.liters);
}

/** Compatibilidad con el nombre anterior. */
export const getSalesHistory = getSales;
