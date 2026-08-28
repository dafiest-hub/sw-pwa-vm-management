import { query, mutate, isMissingColumn, IS_DEMO } from '../lib/dataAccess';
import { supabase } from '../lib/supabaseClient';
import { applyCommonFilters, applyPaging } from './_filters';
import { sampleSystemAlerts } from '../mock/sampleData';

/**
 * No se embebe `profiles` para resolver `resolved_by`: esa columna es opcional
 * (ALTER TABLE aditivo) y un embed sobre una columna inexistente devuelve 400 y
 * tumbaría la página entera. El nombre se resuelve aparte con profileService.
 */
const ALERT_SELECT = '*, machine:machines (id, name, device_id), product:products (id, sku, name)';

const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

function matches(a, filters = {}) {
  const { machineIds, category, alertType, resolved, from, to, includeConfigAck } = filters;
  if (!includeConfigAck && a.alert_type === 'config_ack') return false;
  if (Array.isArray(machineIds) && machineIds.length && !machineIds.includes(a.machine_id)) return false;
  if (category && category !== 'all' && a.category !== category) return false;
  if (alertType && alertType !== 'all' && a.alert_type !== alertType) return false;
  if (resolved === 'pending' && a.is_resolved) return false;
  if (resolved === 'resolved' && !a.is_resolved) return false;
  if (from && new Date(a.created_at) < new Date(from)) return false;
  if (to && new Date(a.created_at) > new Date(to)) return false;
  return true;
}

export async function getAlerts(filters = {}) {
  return query(
    'alerts.getAlerts',
    (sb) => {
      let q = sb.from('system_alerts').select(ALERT_SELECT);
      q = applyCommonFilters(q, filters);
      if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters.alertType && filters.alertType !== 'all') q = q.eq('alert_type', filters.alertType);
      if (filters.resolved === 'pending') q = q.eq('is_resolved', false);
      if (filters.resolved === 'resolved') q = q.eq('is_resolved', true);
      // config_ack lo inserta el webhook ya resuelto: ensucia la bandeja.
      if (!filters.includeConfigAck) q = q.neq('alert_type', 'config_ack');
      return applyPaging(q.order('created_at', { ascending: false }), { pageSize: 200, ...filters });
    },
    () => sampleSystemAlerts.filter((a) => matches(a, filters)).sort(byDateDesc)
  );
}

/**
 * `resolved_by` es una columna opcional. Si aún no se ha aplicado el
 * ALTER TABLE, PostgREST responde "columna desconocida": se reintenta sin ella
 * en vez de romper. El resultado se memoriza para no repetir el intento.
 */
let supportsResolvedBy = true;

export async function resolveAlert(alertId, { resolvedBy } = {}) {
  const base = { is_resolved: true, resolved_at: new Date().toISOString() };

  if (IS_DEMO) {
    const a = sampleSystemAlerts.find((x) => x.id === alertId);
    if (a) Object.assign(a, base, { resolved_by: resolvedBy || null });
    return a;
  }

  const run = (payload) =>
    supabase.from('system_alerts').update(payload).eq('id', alertId).select().maybeSingle();

  const wantsAuthor = supportsResolvedBy && Boolean(resolvedBy);
  let { data, error } = await run(wantsAuthor ? { ...base, resolved_by: resolvedBy } : base);

  if (error && wantsAuthor && isMissingColumn(error, 'resolved_by')) {
    supportsResolvedBy = false;
    console.info(
      '[alerts.resolveAlert] La columna resolved_by no existe; se resuelve sin autoría. ' +
        'Aplica el ALTER TABLE de .doc/REDISENO_2026-08.md para registrar quién resuelve.'
    );
    ({ data, error } = await run(base));
  }

  if (error) {
    console.error(`[alerts.resolveAlert] ${error.code || '?'} — ${error.message}`);
    throw error;
  }
  return data;
}

export async function reopenAlert(alertId) {
  return mutate(
    'alerts.reopenAlert',
    (sb) =>
      sb
        .from('system_alerts')
        .update({ is_resolved: false, resolved_at: null })
        .eq('id', alertId)
        .select()
        .maybeSingle(),
    () => {
      const a = sampleSystemAlerts.find((x) => x.id === alertId);
      if (a) Object.assign(a, { is_resolved: false, resolved_at: null, resolved_by: null });
      return a;
    }
  );
}

export async function resolveAlerts(ids, opts) {
  const results = await Promise.allSettled(ids.map((id) => resolveAlert(id, opts)));
  return {
    ok: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

/** Última confirmación de configuración enviada por la máquina. */
export async function getLastConfigAck(machineId) {
  const rows = await query(
    'alerts.getLastConfigAck',
    (sb) =>
      sb
        .from('system_alerts')
        .select('*')
        .eq('machine_id', machineId)
        .eq('alert_type', 'config_ack')
        .order('created_at', { ascending: false })
        .limit(1),
    () =>
      sampleSystemAlerts
        .filter((a) => a.machine_id === machineId && a.alert_type === 'config_ack')
        .sort(byDateDesc)
        .slice(0, 1)
  );
  return rows[0] || null;
}
