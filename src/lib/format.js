const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_TIME = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

const DATE_ONLY = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric',
});

export const formatMoney = (n) => MXN.format(Number(n || 0));

export const formatLiters = (n, decimals = 3) =>
  `${Number(n || 0).toFixed(decimals)} L`;

export const formatNumber = (n, decimals = 0) =>
  Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const formatPercent = (n, decimals = 1) =>
  `${Number(n || 0).toFixed(decimals)} %`;

export const formatDateTime = (iso) => (iso ? DATE_TIME.format(new Date(iso)) : '—');
export const formatDate = (iso) => (iso ? DATE_ONLY.format(new Date(iso)) : '—');

/** "hace 4 min" — para keepalive y alertas recientes. */
export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(iso);
}

export const PAYMENT_TYPES = ['monedas', 'efectivo', 'tarjeta'];

const PAYMENT_LABELS = {
  monedas: 'Monedas',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
};

export const paymentTypeLabel = (t) => PAYMENT_LABELS[t] || t || '—';

export const saleStatusLabel = (s) =>
  s === 'success' ? 'Concretada' : s === 'fail' ? 'Fallida' : s || '—';

export const machineStatusLabel = (s) =>
  ({ online: 'En línea', offline: 'Fuera de línea', maintenance: 'Mantenimiento', security_lock: 'Bloqueo de seguridad' }[s] || s || '—');

export const roleLabel = (r) =>
  ({ admin: 'Administrador', technician: 'Técnico', viewer: 'Consulta' }[r] || r || '—');
