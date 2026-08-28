/**
 * Filtros comunes a las consultas de sales / sale_incomes / system_alerts /
 * tank_operations. Todas comparten machine_id y created_at.
 */

export function applyCommonFilters(q, filters = {}, { dateColumn = 'created_at' } = {}) {
  const ids = filters.machineIds;
  if (Array.isArray(ids)) {
    if (ids.length === 1) q = q.eq('machine_id', ids[0]);
    else if (ids.length > 1) q = q.in('machine_id', ids);
    // ids === [] significa "sin máquinas asignadas": lo resuelve el llamador.
  }
  if (filters.productId) q = q.eq('product_id', filters.productId);
  if (filters.from) q = q.gte(dateColumn, filters.from);
  if (filters.to) q = q.lte(dateColumn, filters.to);
  return q;
}

export function applyPaging(q, { page = 0, pageSize = 100 } = {}) {
  return q.range(page * pageSize, page * pageSize + pageSize - 1);
}

/**
 * <input type="datetime-local"> entrega hora LOCAL sin zona.
 * new Date(v) la interpreta como local y toISOString() la pasa a UTC, que es
 * lo que espera Postgres. Sin esta conversión los rangos de hora salen movidos.
 */
export const localToISO = (v) => (v ? new Date(v).toISOString() : undefined);

/** Inversa: ISO UTC -> valor para <input type="datetime-local"> en hora local. */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Rango por defecto: últimos N días. Evita descargar la tabla entera. */
export function defaultRange(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Intersección del filtro elegido con las máquinas asignadas al usuario. */
export function scopeMachineIds(selected, assigned, isAdmin) {
  const sel = Array.isArray(selected) && selected.length ? selected : null;
  if (isAdmin) return sel;
  const asg = Array.isArray(assigned) ? assigned : [];
  if (!asg.length) return sel;
  return sel ? sel.filter((id) => asg.includes(id)) : asg;
}
