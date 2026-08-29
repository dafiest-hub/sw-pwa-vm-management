import { query } from '../lib/dataAccess';
import { applyCommonFilters, applyPaging } from './_filters';
import { sampleTankOperations, sampleMoneyCollections } from '../mock/sampleData';

/**
 * NO se embebe `profiles`.
 *
 * El código anterior usaba `technician:public.profiles (...)`: el prefijo de
 * esquema no es sintaxis válida de embed en PostgREST, así que la consulta
 * devolvía 400 y (con el patrón antiguo de fallback silencioso) la página
 * mostraba datos de demostración creyendo que eran reales.
 *
 * Los nombres de técnico se resuelven aparte con profileService.
 *
 * Este módulo es de SÓLO LECTURA: el nivel de los tanques y las operaciones los
 * publica la máquina, la PWA no los escribe (ver §14 de REDISENO_2026-08.md).
 */
const OP_SELECT = '*, product:products (id, sku, name), machine:machines (id, name, device_id)';
const COLLECTION_SELECT = '*, machine:machines (id, name, device_id)';

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
