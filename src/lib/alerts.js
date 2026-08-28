import {
  DoorOpen, Lock, Vibrate, PackageX, ZapOff, Zap, Gauge,
  XCircle, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert, Cpu,
} from 'lucide-react';

/** Categorías reales del enum alert_category_enum. */
export const ALERT_CATEGORY_META = {
  security: { label: 'Seguridad física', icon: ShieldAlert, tone: 'danger' },
  pump:     { label: 'Bomba / flujo',    icon: ZapOff,      tone: 'warn' },
  stock:    { label: 'Nivel de tanque',  icon: PackageX,    tone: 'warn' },
  sales:    { label: 'Ventas',           icon: XCircle,     tone: 'danger' },
  module:   { label: 'Módulo',           icon: Cpu,         tone: 'neutral' },
};

/**
 * alert_type reales que emite el firmware (VARCHAR libre, sin enum en la BD).
 * Los valores del mock antiguo (low_stock_warning, pump_flow_discrepancy,
 * door_open_warning) NO existen en producción.
 */
export const ALERT_TYPE_META = {
  door_open:        { label: 'Puerta abierta',           icon: DoorOpen,    tone: 'danger' },
  coinbox_tampered: { label: 'Monedero manipulado',      icon: Lock,        tone: 'danger' },
  tilt_detected:    { label: 'Impacto / inclinación',    icon: Vibrate,     tone: 'danger' },
  low_stock:        { label: 'Nivel bajo',               icon: PackageX,    tone: 'warn' },
  pump_disabled:    { label: 'Bomba deshabilitada',      icon: ZapOff,      tone: 'warn' },
  pump_enabled:     { label: 'Bomba rehabilitada',       icon: Zap,         tone: 'ok' },
  flow_sensor_fail: { label: 'Fallo del sensor de flujo',icon: Gauge,       tone: 'warn' },
  sale_failed:      { label: 'Venta fallida',            icon: XCircle,     tone: 'danger' },
  restart:          { label: 'Reinicio del módulo',      icon: RefreshCw,   tone: 'neutral' },
  config_ack:       { label: 'Configuración aplicada',   icon: CheckCircle2,tone: 'ok' },
};

export const alertTypeMeta = (t) =>
  ALERT_TYPE_META[t] || { label: t || 'Incidencia', icon: AlertTriangle, tone: 'neutral' };

export const alertCategoryMeta = (c) =>
  ALERT_CATEGORY_META[c] || { label: c || 'Otra', icon: AlertTriangle, tone: 'neutral' };

const num = (v, d = 2) => (v === null || v === undefined ? null : Number(v).toFixed(d));

const productName = (a) => a.product?.name || a.product_name || null;

/**
 * Compone una frase legible.
 *
 * No se puede imprimir `value_string` a secas: el webhook lo llena con
 * `note ?? reason ?? product`, así que en low_stock y pump_* contiene sólo el
 * NOMBRE DEL PRODUCTO, no una descripción.
 */
export function alertMessage(a) {
  if (!a) return '';
  const prod = productName(a);
  const tank = a.tank_number ? `Tanque ${a.tank_number}` : null;
  const where = [tank, prod && `(${prod})`].filter(Boolean).join(' ');
  const v1 = num(a.value_num1, 3);
  const v2 = num(a.value_num2, 3);

  switch (a.alert_type) {
    case 'low_stock':
      return `${where || 'Un tanque'}: quedan ${v1 ?? '?'} L, por debajo del mínimo de ${v2 ?? '?'} L`;
    case 'flow_sensor_fail':
      return `${where || 'Un tanque'}: el medidor registró ${v1 ?? '?'} L frente a ${v2 ?? '?'} L esperados`;
    case 'sale_failed':
      return `${where || 'Un tanque'}: se esperaban ${v1 ?? '?'} L y se midieron ${v2 ?? '?'} L`;
    case 'pump_disabled':
      return `${where || 'Una bomba'}: deshabilitada tras un fallo de dispensado`;
    case 'pump_enabled':
      return `${where || 'Una bomba'}: reactivada manualmente`;
    case 'coinbox_tampered':
      return `Monedero manipulado${a.value_num1 != null ? ` · saldo en el momento: $${num(a.value_num1)}` : ''}`;
    case 'door_open':
      return 'Puerta del gabinete abierta';
    case 'tilt_detected':
      return 'Se detectó inclinación o impacto en el gabinete';
    case 'restart':
      return `Reinicio del módulo${a.value_string ? ` · motivo: ${a.value_string}` : ''}`;
    case 'config_ack':
      return `La máquina confirmó la configuración recibida`;
    default:
      break;
  }

  // Fallback: usa value_string sólo si parece una frase, no un nombre suelto.
  const s = (a.value_string || '').trim();
  if (s && s.split(/\s+/).length >= 3) return s;
  return [alertTypeMeta(a.alert_type).label, where].filter(Boolean).join(' · ');
}

/** Línea secundaria con los valores crudos, para el detalle. */
export function alertDetailLine(a) {
  const parts = [];
  if (a.value_num1 != null) parts.push(`Observado: ${num(a.value_num1, 3)}`);
  if (a.value_num2 != null) parts.push(`Referencia: ${num(a.value_num2, 3)}`);
  if (a.value_string) parts.push(a.value_string);
  return parts.join(' · ');
}

/** Extrae el req_id que el webhook embebe como texto plano en value_string. */
export function parseConfigAck(a) {
  const s = a?.value_string || '';
  const req = s.match(/req_id=([0-9a-f-]+)/i)?.[1] || null;
  const status = s.match(/status=(\w+)/i)?.[1] || null;
  return { req_id: req, status };
}
