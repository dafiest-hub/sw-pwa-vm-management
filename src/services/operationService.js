import { query, mutate, IS_DEMO } from '../lib/dataAccess';
import { supabase } from '../lib/supabaseClient';
import { applyCommonFilters, applyPaging } from './_filters';
import { sampleTankOperations, sampleMoneyCollections, sampleTanks } from '../mock/sampleData';

/**
 * NO se embebe `profiles`.
 *
 * El código anterior usaba `technician:public.profiles (...)`: el prefijo de
 * esquema no es sintaxis válida de embed en PostgREST, así que la consulta
 * devolvía 400 y (con el patrón antiguo de fallback silencioso) la página
 * mostraba datos de demostración creyendo que eran reales.
 *
 * Los nombres de técnico se resuelven aparte con profileService.
 */
const OP_SELECT = '*, product:products (id, sku, name), machine:machines (id, name, device_id)';
const COLLECTION_SELECT = '*, machine:machines (id, name, device_id)';

/** current_liters lleva CHECK (>= 0) y no puede exceder la capacidad. */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

function matches(row, filters = {}) {
  const { machineIds, from, to, operationType } = filters;
  if (Array.isArray(machineIds) && machineIds.length && !machineIds.includes(row.machine_id)) return false;
  if (operationType && operationType !== 'all' && row.operation_type !== operationType) return false;
  if (from && new Date(row.created_at) < new Date(from)) return false;
  if (to && new Date(row.created_at) > new Date(to)) return false;
  return true;
}

export async function getTankOperations(filters = {}) {
  return query(
    'operations.getTankOperations',
    (sb) => {
      let q = sb.from('tank_operations').select(OP_SELECT);
      q = applyCommonFilters(q, filters);
      if (filters.operationType && filters.operationType !== 'all')
        q = q.eq('operation_type', filters.operationType);
      return applyPaging(q.order('created_at', { ascending: false }), { pageSize: 200, ...filters });
    },
    () => sampleTankOperations.filter((o) => matches(o, filters)).sort(byDateDesc)
  );
}

export async function getMoneyCollections(filters = {}) {
  return query(
    'operations.getMoneyCollections',
    (sb) => {
      let q = sb.from('money_collections').select(COLLECTION_SELECT);
      q = applyCommonFilters(q, filters);
      return applyPaging(q.order('created_at', { ascending: false }), { pageSize: 200, ...filters });
    },
    () => sampleMoneyCollections.filter((c) => matches(c, filters)).sort(byDateDesc)
  );
}

/**
 * Registra una recarga: lee el tanque, inserta la operación y actualiza el nivel.
 * No hay transacción; el orden elegido deja la operación auditada aunque falle
 * el update posterior (preferible a actualizar el nivel sin dejar rastro).
 *
 * `net_liters` es GENERATED: nunca se envía.
 */
export async function recordRefillOperation({
  machine_id,
  tank_number,
  product_id,
  liters_added,
  technician_id,
}) {
  if (IS_DEMO) {
    const tank = sampleTanks.find(
      (t) => t.machine_id === machine_id && t.tank_number === tank_number
    );
    if (!tank) throw new Error(`No se encontró el tanque ${tank_number} de esa máquina.`);
    const before = Number(tank.current_liters);
    const after = clamp(before + Number(liters_added), 0, Number(tank.capacity_liters));
    Object.assign(tank, {
      current_liters: after,
      current_percentage: Number(((after / tank.capacity_liters) * 100).toFixed(2)),
      is_above_minimum: after >= Number(tank.low_threshold_liters),
      last_refill_at: new Date().toISOString(),
    });
    const op = {
      id: `op-${Date.now()}`,
      machine_id,
      tank_number,
      product_id,
      operation_type: 'refill',
      tank_liters_before: before,
      tank_liters_after: after,
      net_liters: Number((after - before).toFixed(3)),
      technician_user_id: technician_id || null,
      created_at: new Date().toISOString(),
    };
    sampleTankOperations.unshift(op);
    return op;
  }

  const { data: tank, error: tankErr } = await supabase
    .from('machine_tanks')
    .select('*')
    .eq('machine_id', machine_id)
    .eq('tank_number', tank_number)
    .maybeSingle();

  if (tankErr) {
    console.error(`[operations.recordRefill/read] ${tankErr.code} — ${tankErr.message}`);
    throw tankErr;
  }
  if (!tank) throw new Error(`No se encontró el tanque ${tank_number} de esa máquina.`);

  const before = Number(tank.current_liters);
  const after = clamp(before + Number(liters_added), 0, Number(tank.capacity_liters));

  const { data: op, error: opErr } = await supabase
    .from('tank_operations')
    .insert([
      {
        machine_id,
        tank_number,
        product_id: product_id || tank.product_id,
        operation_type: 'refill',
        tank_liters_before: before,
        tank_liters_after: after,
        technician_user_id: technician_id || null,
      },
    ])
    .select()
    .single();

  if (opErr) {
    console.error(`[operations.recordRefill/insert] ${opErr.code} — ${opErr.message}`);
    throw opErr;
  }

  const { error: updErr } = await supabase
    .from('machine_tanks')
    .update({
      current_liters: after,
      is_above_minimum: after >= Number(tank.low_threshold_liters),
      last_refill_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tank.id);

  if (updErr) {
    console.error(
      `[operations.recordRefill/update] ${updErr.code} — ${updErr.message}. ` +
        'La operación quedó registrada pero el nivel del tanque no se actualizó.'
    );
    throw updErr;
  }

  return op;
}
