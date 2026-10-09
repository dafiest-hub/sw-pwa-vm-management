/**
 * Capa de datos del H-FIS: de las filas crudas de Supabase a las entradas del
 * motor difuso.
 *
 * Ninguna de las entradas del sistema difuso existe tal cual en la base: todas
 * se derivan. Este módulo concentra ESAS derivaciones y sus parámetros, para que
 * la PWA y el prototipo Python (`hfis/db_mapping.py`) compartan exactamente la
 * misma definición — el resultado se compara contra el golden del Python con
 * tolerancia 1e-6, así que las claves de salida son snake_case como allá.
 *
 * Tablas de origen: `machine_tanks` (nivel), `sales` (demanda, discrepancia de
 * flujo, fallos), `system_alerts` (seguridad y bomba), `machine_status`
 * (banderas en vivo y efectivo del monedero), `money_collections` (último corte
 * de caja), `tank_operations` (última recarga/purga).
 *
 * Funciones puras: reciben filas ya leídas y devuelven números. No abren
 * conexiones ni importan nada.
 */

// ===================================================================== //
// Parámetros (todos revisables por el experto). Único sitio donde se cambian.
// ===================================================================== //
export const PARAMS = {
  // --- Inventario ---
  ventanaDemandaDias: 28, // ventana para estimar demanda semanal
  diasStockoutMax: 30, // tope del universo del FIS
  usarUmbralComoFondo: true, // descontar low_threshold_liters
  dmaxMin: 1, // piso de Dmax para no dividir por ~0
  dmaxFactor: 1, // p95 * factor (holgura de escala)

  // --- Seguridad ---
  ventanaSeguridadHoras: 72,
  pesoTilt: 10,
  pesoCoinbox: 8,
  pesoDoor: 5,
  // SIN CALIBRAR: valor por defecto que el operador todavía no ha fijado.
  // Mueve directamente Score_Seg (es el 100 % de la escala de «caja llena»).
  efectivoUmbral: 1500, // MXN que se consideran monedero lleno
  tRecoleccionMax: 21,

  // --- Conectividad ---
  diasSinContactoMax: 14,
  // SIN CALIBRAR: valor por defecto que el operador todavía no ha fijado.
  // Mueve directamente Score_Con (es el ingreso diario que se considera «mucho»).
  valorRefDiario: 300, // MXN/día, idealmente el p95 de la red
  ventanaPistasCaidaHoras: 24, // ventana previa al último keepalive

  // --- Mantenimiento ---
  ventanaSaludDias: 7,
  fallasSaturacion: 5, // n.º de fallos que llevan norm() a 1
  discrepanciaSaturacion: 0.1, // 10 % de error de flujo satura
  pesoFallas: 0.6,
  pesoDiscrepancia: 0.4,
  tIntervencionMax: 90,
};

// alert_type -> clave del peso. El firmware publica estos tres eventos de
// seguridad; cualquier otro alert_type de categoría 'security' se ignora.
const PESOS_SEVERIDAD = {
  tilt_detected: 'pesoTilt',
  coinbox_tampered: 'pesoCoinbox',
  door_open: 'pesoDoor',
};

// ===================================================================== //
// Utilidades de tiempo
// ===================================================================== //

/** Parsea un TIMESTAMPTZ de PostgREST. Devuelve `Date` o `null`. */
export function parseTs(valor) {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  let s = String(valor).trim();
  // Python asume UTC cuando el ISO no trae offset; Date.parse asumiría hora
  // local (−6 h en México) y 6 h mueven una máquina de «En línea» a «Caída».
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/**
 * Días transcurridos, o `null` si no hay fecha válida. El `null` no es 0: varias
 * derivaciones lo distinguen y es él quien activa el valor de peor caso.
 */
export function diasEntre(desde, ahora) {
  const d = parseTs(desde);
  if (d === null) return null;
  return Math.max(0, (ahora.getTime() - d.getTime()) / 86400000);
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Python `str(x or "")` sobre un valor posiblemente nulo.
const texto = (v) => (v === null || v === undefined || v === false ? '' : String(v));

// Python distingue la clave ausente (None) del valor presente; en JS undefined
// y null tienen que colapsar al mismo None.
const nulo = (v) => (v === undefined ? null : v);

// isoformat() de Python para un instante UTC: '2026-09-01T12:00:00+00:00'.
// `toISOString()` daría '...12:00:00.000Z' y `meta.calculado_en` dejaría de
// coincidir con el golden.
const isoUtc = (d) => d.toISOString().replace(/\.000Z$/, 'Z').replace(/Z$/, '+00:00');

// ===================================================================== //
// INVENTARIO
// ===================================================================== //

/**
 * L/semana del tanque, promediados sobre la ventana de 28 días. Sólo cuentan
 * las ventas concretadas: una venta fallida no es demanda.
 */
export function demandaSemanal(ventas, tankNumber, ahora, p = PARAMS) {
  let total = 0;
  for (const v of ventas) {
    const n = v.tank_number === undefined ? -1 : Math.trunc(Number(v.tank_number));
    if (n !== tankNumber) continue;
    const st = nulo(v.status);
    if (st !== null && st !== 'success') continue;
    const d = diasEntre(v.created_at, ahora);
    if (d === null || d > p.ventanaDemandaDias) continue;
    total += Number(v.liters_purchased || 0);
  }
  return (total * 7) / p.ventanaDemandaDias;
}

/**
 * Días hasta agotar el producto útil al ritmo actual. «Útil» = por encima de
 * `low_threshold_liters`, el fondo que la máquina ya considera vacío. Sin
 * demanda el horizonte es el tope del universo, no 0.
 */
export function diasAStockout(currentLiters, lowThresholdLiters, demandaSem, p = PARAMS) {
  const fondo = p.usarUmbralComoFondo ? Number(lowThresholdLiters || 0) : 0;
  const utiles = Math.max(0, Number(currentLiters) - fondo);
  const diaria = demandaSem / 7;
  if (diaria <= 1e-9) return p.diasStockoutMax;
  return clamp(utiles / diaria, 0, p.diasStockoutMax);
}

/**
 * Percentil 95 de la demanda semanal histórica -> escala del FIS. Interpolación
 * lineal idéntica a `numpy.percentile(..., method='linear')`.
 *
 * La fase 1 NO la usa: no hay histórico todavía (ver `construirTanques`).
 */
export function dmaxTanque(demandasHistoricas, p = PARAMS) {
  const xs = Array.from(demandasHistoricas)
    .filter((x) => x !== null && x !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
  if (xs.length === 0) return Math.max(p.dmaxMin, 50);
  if (xs.length === 1) return Math.max(p.dmaxMin, xs[0] * p.dmaxFactor);
  const pos = 0.95 * (xs.length - 1);
  const lo = Math.trunc(pos);
  const hi = Math.min(lo + 1, xs.length - 1);
  const val = xs[lo] + (pos - lo) * (xs[hi] - xs[lo]);
  return Math.max(p.dmaxMin, val * p.dmaxFactor);
}

/** machine_tanks + sales -> entradas del FIS-Inventario. */
export function construirTanques(tanques, ventas, ahora, dmaxPorTanque = null, p = PARAMS) {
  const out = [];
  for (const t of tanques) {
    const n = Math.trunc(Number(t.tank_number));
    const cap = Number(t.capacity_liters || 0);
    const cur = Number(t.current_liters || 0);
    const pct = nulo(t.current_percentage);
    const nivel = pct !== null ? Number(pct) : cap ? (100 * cur) / cap : 0;
    const dem = demandaSemanal(ventas, n, ahora, p);
    let dmax = dmaxPorTanque ? nulo(dmaxPorTanque[n]) : null;
    if (dmax === null) {
      // shortcut: Dmax = max(1, max(demanda*1.5, capacity)) por falta de histórico.
      // Migrar al p95 de 52 semanas (v_dmax_tanque) con ≥3 meses de ventas reales.
      dmax = Math.max(p.dmaxMin, Math.max(dem * 1.5, cap ? cap : 50));
    }
    out.push({
      tank_number: n,
      nivel: clamp(nivel, 0, 100),
      demanda: dem,
      dias_stockout: diasAStockout(cur, t.low_threshold_liters === undefined ? 0 : t.low_threshold_liters, dem, p),
      dmax,
      // El nombre del producto llega por el embed de PostgREST, no como columna
      // plana. Es sólo informativo: no entra a ningún FIS.
      producto: texto(t.product?.name ?? t.product_name ?? ''),
    });
  }
  return out;
}

// ===================================================================== //
// SEGURIDAD
// ===================================================================== //

/**
 * max(10*tilt, 8*coinbox, 5*door) en la ventana de 72 h.
 *
 * Dos fuentes: `system_alerts` de categoría 'security' dentro de la ventana y
 * las banderas EN VIVO de `machine_status` — una condición activa cuenta aunque
 * su alerta original haya caído fuera de la ventana. `machines.status =
 * 'security_lock'` satura: la máquina se bloqueó sola, la señal más fuerte que
 * existe.
 *
 * Nota: no se filtra por `is_resolved` a propósito — una alerta resuelta dentro
 * de la ventana sigue describiendo una máquina que hay que mirar.
 */
export function severidadEventos(alertas, status, ahora, p = PARAMS, estadoMaquina = '') {
  let sev = 0;
  for (const a of alertas) {
    // Asimetría intencional: aquí una `category` nula se acepta como security
    // (en salud, en cambio, una nula NO cuenta como pump).
    const cat = nulo(a.category);
    if (cat !== null && cat !== 'security') continue;
    const d = diasEntre(a.created_at, ahora);
    if (d === null || d * 24 > p.ventanaSeguridadHoras) continue;
    const campo = PESOS_SEVERIDAD[texto(a.alert_type).trim().toLowerCase()];
    if (campo) sev = Math.max(sev, Number(p[campo]));
  }
  if (status) {
    if (status.tilt_detected) sev = Math.max(sev, p.pesoTilt);
    if (status.coinbox_tampered) sev = Math.max(sev, p.pesoCoinbox);
    if (status.door_open) sev = Math.max(sev, p.pesoDoor);
  }
  if (texto(estadoMaquina).trim().toLowerCase() === 'security_lock') sev = 10;
  return clamp(sev, 0, 10);
}

/** Días desde el último corte de caja exitoso. Nunca recolectada -> tope 21. */
export function diasUltimaRecoleccion(colecciones, ahora, p = PARAMS) {
  let mejor = null;
  for (const c of colecciones) {
    const st = nulo(c.status);
    if (st !== null && st !== 'success') continue;
    const d = diasEntre(c.created_at, ahora);
    if (d !== null && (mejor === null || d < mejor)) mejor = d;
  }
  if (mejor === null) return p.tRecoleccionMax; // sin recolección: lo peor posible
  return clamp(mejor, 0, p.tRecoleccionMax);
}

/**
 * `stored_cash_balance` como % del umbral de recolección.
 *
 * NUNCA `available_balance`: son dos cifras distintas y confundirlas es el error
 * clásico de este proyecto. `available_balance` es el saldo de la sesión en curso
 * (baja al concretarse la venta); `stored_cash_balance` es el dinero físicamente
 * acumulado en el monedero, que sólo vuelve a 0 con el corte de caja.
 */
export function efectivoPct(status, p = PARAMS) {
  if (!status) return 0;
  const v = Number(status.stored_cash_balance || 0);
  if (p.efectivoUmbral <= 0) return 0;
  return clamp((100 * v) / p.efectivoUmbral, 0, 100);
}

// ===================================================================== //
// MANTENIMIENTO
// ===================================================================== //

/**
 * 0.6*norm(fallas de bomba 7 d) + 0.4*norm(discrepancia de flujo 7 d).
 * 0 = sana, 1 = crítica.
 *
 * - Fallas: ventas con `status='fail'` más alertas de categoría 'pump'.
 * - Discrepancia: error relativo medio |flujo − cobrado| / cobrado de las ventas
 *   exitosas. Es la señal de bomba/medidor descalibrado que NO produce alerta.
 */
export function saludDispensacion(ventas, alertas, ahora, p = PARAMS) {
  let fallas = 0;
  const errores = [];
  for (const v of ventas) {
    const d = diasEntre(v.created_at, ahora);
    if (d === null || d > p.ventanaSaludDias) continue;
    if (nulo(v.status) === 'fail') {
      fallas += 1;
      continue;
    }
    const pedidos = Number(v.liters_purchased || 0);
    const medidos = Number(v.liters_flow_sensor || 0);
    if (pedidos > 1e-6) errores.push(Math.abs(medidos - pedidos) / pedidos);
  }
  for (const a of alertas) {
    // Asimetría intencional: `!== 'pump'`, así que una categoría nula NO cuenta
    // como bomba (al contrario que en severidadEventos).
    if (nulo(a.category) !== 'pump') continue;
    const d = diasEntre(a.created_at, ahora);
    if (d !== null && d <= p.ventanaSaludDias) fallas += 1;
  }
  const nFallas = clamp(fallas / Math.max(1, p.fallasSaturacion), 0, 1);
  const errMedio = errores.length ? errores.reduce((s, x) => s + x, 0) / errores.length : 0;
  const nDiscrep = clamp(errMedio / p.discrepanciaSaturacion, 0, 1);
  return clamp(p.pesoFallas * nFallas + p.pesoDiscrepancia * nDiscrep, 0, 1);
}

/**
 * Días desde la última recarga/purga. Se considera también
 * `machine_tanks.last_refill_at`, que sobrevive aunque la fila de
 * `tank_operations` se haya purgado del histórico. Sin ninguna de las dos -> 90.
 */
export function diasUltimaIntervencion(operaciones, tanques, ahora, p = PARAMS) {
  let mejor = null;
  for (const o of operaciones) {
    const tipo = nulo(o.operation_type);
    if (tipo !== null && tipo !== 'refill' && tipo !== 'purge') continue;
    const d = diasEntre(o.created_at, ahora);
    if (d !== null && (mejor === null || d < mejor)) mejor = d;
  }
  for (const t of tanques) {
    const d = diasEntre(t.last_refill_at, ahora);
    if (d !== null && (mejor === null || d < mejor)) mejor = d;
  }
  if (mejor === null) return p.tIntervencionMax;
  return clamp(mejor, 0, p.tIntervencionMax);
}

// ===================================================================== //
// CONECTIVIDAD
// ===================================================================== //

/**
 * Días desde el último keepalive (tope 14).
 *
 * Fuente primaria: `machine_status.last_keepalive_at`, que el consumidor MQTT
 * actualiza con cada mensaje periódico — medida continua, mucho más útil que el
 * enum. Sin fila de estado o sin keepalive se devuelve el tope: no saber nada es
 * el peor caso, no el mejor, y es el peor caso más agresivo del sistema (la
 * máquina encabeza la ruta).
 *
 * Respaldo: `machines.status = 'offline'` lo escribe un proceso administrativo,
 * no la máquina; si dice 'offline' se sube a al menos 1 día para que no pase
 * inadvertido, pero nunca se baja. Y el enum NUNCA se usa para afirmar que está
 * en línea: un `status='online'` con el keepalive de hace una semana describe una
 * máquina caída cuyo enum nadie actualizó.
 */
export function diasSinContacto(status, maquina, ahora, p = PARAMS) {
  let d = diasEntre((status || {}).last_keepalive_at, ahora);
  const estado = texto((maquina || {}).status || '').trim().toLowerCase();
  if (d === null) return p.diasSinContactoMax;
  d = clamp(d, 0, p.diasSinContactoMax);
  if (estado === 'offline') d = Math.max(d, 1);
  return d;
}

/**
 * Ingreso diario estimado (MXN) sobre la ventana de demanda: «cuánto cuesta cada
 * día que esta máquina esté caída». Se estima desde `sales`, que sigue en la base
 * aunque la máquina esté incomunicada — el histórico no se cae con el módem.
 *
 * Ojo: `price_paid` en esta base es el cobro por surtido de 500 ml, no por litro.
 * La fórmula se replica tal cual del Python a propósito.
 */
export function valorDiario(ventas, ahora, precioPorLitro = 30, p = PARAMS) {
  let total = 0;
  for (const v of ventas) {
    const st = nulo(v.status);
    if (st !== null && st !== 'success') continue;
    const d = diasEntre(v.created_at, ahora);
    if (d === null || d > p.ventanaDemandaDias) continue;
    let importe = nulo(v.price_paid);
    if (importe === null) importe = Number(v.liters_purchased || 0) * precioPorLitro;
    total += Number(importe);
  }
  return total / p.ventanaDemandaDias;
}

/**
 * ¿Hubo alertas de bomba o seguridad justo antes de perder contacto?
 *
 * Con alertas previas la caída es probablemente del EQUIPO (energía, módem,
 * un fallo que tiró la máquina): hay que ir. Sin ellas es una desconexión limpia,
 * compatible con SIM sin saldo o corte de cobertura: conviene verificar el saldo
 * antes de mandar a alguien. No es un diagnóstico, es una pista — el saldo de la
 * SIM no existe como dato en la base.
 */
export function alertasAntesDeCaer(alertas, status, ahora, p = PARAMS) {
  const ultimo = parseTs((status || {}).last_keepalive_at);
  if (ultimo === null) return false;
  const ventana = p.ventanaPistasCaidaHoras / 24;
  for (const a of alertas) {
    const cat = nulo(a.category);
    if (cat !== 'pump' && cat !== 'security') continue;
    const t = parseTs(a.created_at);
    if (t === null) continue;
    const delta = (ultimo.getTime() - t.getTime()) / 86400000;
    if (delta >= 0 && delta <= ventana) return true;
  }
  return false;
}

// ===================================================================== //
// ENSAMBLADO
// ===================================================================== //

/**
 * Convierte un `bundle` de filas de Supabase (lo que devuelve la función SQL
 * `bundle_hfis()`) en el objeto que consume el motor difuso.
 */
export function construirMaquina(bundle, ahora = null, dmaxPorTanque = null, p = PARAMS) {
  const t0 = ahora || new Date();
  const maq = bundle.machine || {};
  const tanks = bundle.tanks || [];
  const ventas = bundle.sales || [];
  const alertas = bundle.alerts || [];
  const colecciones = bundle.collections || [];
  const operaciones = bundle.operations || [];
  const status = nulo(bundle.status);

  const tRec = diasUltimaRecoleccion(colecciones, t0, p);
  const tInt = diasUltimaIntervencion(operaciones, tanks, t0, p);
  const estado = texto(maq.status || '');

  return {
    id: texto(maq.device_id || maq.id || '?'),
    nombre: texto(maq.name || ''),
    machine_id: texto(maq.id || ''),
    // «Visita» = cualquier presencia física: corte de caja o mantenimiento.
    dias_desde_visita: Math.min(tRec, tInt),
    meta: { calculado_en: isoUtc(t0) },
    tanques: construirTanques(tanks, ventas, t0, dmaxPorTanque, p),
    seguridad: {
      severidad: severidadEventos(alertas, status, t0, p, estado),
      t_recoleccion: tRec,
      efectivo: efectivoPct(status, p),
    },
    mantenimiento: {
      salud: saludDispensacion(ventas, alertas, t0, p),
      temp: null, // la BD no expone temperatura
      t_intervencion: tInt,
    },
    conectividad: {
      dias_sin_contacto: diasSinContacto(status, maq, t0, p),
      valor_diario: valorDiario(ventas, t0, 30, p),
      valor_ref: p.valorRefDiario,
      estado_declarado: estado,
      alertas_antes_de_caer: alertasAntesDeCaer(alertas, status, t0, p),
    },
  };
}

export function construirRed(bundles, ahora = null, p = PARAMS) {
  const t0 = ahora || new Date();
  return Array.from(bundles).map((b) => construirMaquina(b, t0, null, p));
}
