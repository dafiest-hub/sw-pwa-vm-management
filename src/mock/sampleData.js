/**
 * Datos de demostración (Demo Mode).
 *
 * Reflejan el esquema REAL de Supabase (supabase_db_design.md), incluidos los
 * casos borde del enlace venta-ingreso por (machine_id, tx_id): pago mixto,
 * doble ingreso del mismo tipo, venta fallida sin cobro, venta legacy con
 * tx_id NULL, ingreso huérfano y venta concretada sin ingreso.
 *
 * Los servicios mutan estos arrays (push/unshift); ese contrato se mantiene.
 */

const M1 = 'm1111111-1111-1111-1111-111111111111';
const M2 = 'm2222222-2222-2222-2222-222222222222';
const M3 = 'm3333333-3333-3333-3333-333333333333';

// Catálogo alineado con producción (SKU reales del alta de VM96E1A4)
export const sampleProducts = [
  { id: 'p1111111-1111-1111-1111-111111111111', sku: 'JAB-MANOS', name: 'Jabón para Manos', description: 'Jabón líquido neutro con glicerina para dispensadores.', default_price_per_liter: 15.0, density_kg_m3: 1016.0, created_at: '2026-07-01T10:00:00Z' },
  { id: 'p2222222-2222-2222-2222-222222222222', sku: 'LIMP-MULTI', name: 'Limpiador Multiusos', description: 'Limpiador de superficies de uso general, aroma cítrico.', default_price_per_liter: 10.0, density_kg_m3: 995.0, created_at: '2026-07-01T10:05:00Z' },
  { id: 'p3333333-3333-3333-3333-333333333333', sku: 'CLORO', name: 'Cloro', description: 'Hipoclorito de sodio al 6 % para desinfección.', default_price_per_liter: 7.0, density_kg_m3: 1075.0, created_at: '2026-07-01T10:10:00Z' },
  { id: 'p4444444-4444-4444-4444-444444444444', sku: 'DESENGRA', name: 'Desengrasante', description: 'Desengrasante industrial concentrado para cocina.', default_price_per_liter: 20.0, density_kg_m3: 1023.0, created_at: '2026-07-01T10:15:00Z' },
  { id: 'p5555555-5555-5555-5555-555555555555', sku: 'SUAVIZANTE', name: 'Suavizante de Telas', description: 'Suavizante concentrado de larga duración.', default_price_per_liter: 14.0, density_kg_m3: 1000.0, created_at: '2026-07-01T10:20:00Z' },
  { id: 'p6666666-6666-6666-6666-666666666666', sku: 'DET-MANCHAS', name: 'Detergente Quita-Manchas', description: 'Detergente líquido con enzimas quitamanchas.', default_price_per_liter: 14.0, density_kg_m3: 1000.0, created_at: '2026-07-01T10:25:00Z' },
  { id: 'p7777777-7777-7777-7777-777777777777', sku: 'DET-COLOR', name: 'Detergente Pro-Color', description: 'Detergente para ropa de color, protege la intensidad.', default_price_per_liter: 13.0, density_kg_m3: 1040.0, created_at: '2026-07-01T10:30:00Z' },
  { id: 'p8888888-8888-8888-8888-888888888888', sku: 'DET-TRASTES', name: 'Detergente para Trastes', description: 'Lavavajillas líquido concentrado, alto poder desengrasante.', default_price_per_liter: 14.0, density_kg_m3: 1030.0, created_at: '2026-07-01T10:35:00Z' },
];

const bySku = (sku) => sampleProducts.find((p) => p.sku === sku);

export const sampleMachines = [
  { id: M1, device_id: 'VM96E1A4', name: 'Expendedora Central Plaza Tec', location_address: 'Av. Tecnológico 4500, Módulo de Lavanderías, Col. Centro', latitude: 20.6736, longitude: -103.344, status: 'online', firmware_version: '2.1.0', created_at: '2026-08-01T08:00:00Z', updated_at: '2026-08-27T09:30:00Z' },
  { id: M2, device_id: 'VM4C2B77', name: 'Expendedora Residencial Las Palmas', location_address: 'Calle Palmas 12, frente a Administración', latitude: 20.68, longitude: -103.35, status: 'online', firmware_version: '2.1.0', created_at: '2026-08-02T09:00:00Z', updated_at: '2026-08-27T09:28:00Z' },
  { id: M3, device_id: 'VM7D3E19', name: 'Expendedora Universidad Campus Sur', location_address: 'Edificio E, Cafetería General', latitude: 20.65, longitude: -103.33, status: 'maintenance', firmware_version: '2.0.0', created_at: '2026-08-03T11:00:00Z', updated_at: '2026-08-26T18:15:00Z' },
];

export const sampleMachineStatus = [
  { machine_id: M1, available_balance: 12.5, stored_cash_balance: 1284.0, door_open: false, coinbox_tampered: false, tilt_detected: false, last_keepalive_at: '2026-08-27T09:30:00Z', updated_at: '2026-08-27T09:30:00Z' },
  { machine_id: M2, available_balance: 0.0, stored_cash_balance: 736.5, door_open: false, coinbox_tampered: false, tilt_detected: false, last_keepalive_at: '2026-08-27T09:28:00Z', updated_at: '2026-08-27T09:28:00Z' },
  { machine_id: M3, available_balance: 0.0, stored_cash_balance: 402.0, door_open: true, coinbox_tampered: false, tilt_detected: true, last_keepalive_at: '2026-08-26T18:15:00Z', updated_at: '2026-08-26T18:15:00Z' },
];

// Capacidades reales del firmware: T1 30, T2 60, T3 60, T4 50, T5 50, T6 50, T7 50, T8 30
const TANK_LAYOUT = [
  { n: 1, sku: 'JAB-MANOS', price: 15.0, cap: 30, low: 3.0 },
  { n: 2, sku: 'LIMP-MULTI', price: 10.0, cap: 60, low: 4.0 },
  { n: 3, sku: 'CLORO', price: 7.0, cap: 60, low: 4.0 },
  { n: 4, sku: 'DESENGRA', price: 20.0, cap: 50, low: 3.0 },
  { n: 5, sku: 'SUAVIZANTE', price: 14.0, cap: 50, low: 3.0 },
  { n: 6, sku: 'DET-MANCHAS', price: 14.0, cap: 50, low: 3.0 },
  { n: 7, sku: 'DET-COLOR', price: 13.0, cap: 50, low: 3.0 },
  { n: 8, sku: 'DET-TRASTES', price: 14.0, cap: 30, low: 3.0 },
];

// Las 3 máquinas tienen sus 8 tanques: el editor masivo se puede probar en todas.
function buildTanks(machineId, prefix, fill) {
  return TANK_LAYOUT.map((t, i) => {
    const product = bySku(t.sku);
    const current = Number((t.cap * fill[i]).toFixed(3));
    return {
      id: prefix + '0' + t.n,
      machine_id: machineId,
      tank_number: t.n,
      product_id: product.id,
      price_per_liter: t.price,
      capacity_liters: t.cap,
      current_liters: current,
      current_percentage: Number(((current / t.cap) * 100).toFixed(2)),
      low_threshold_liters: t.low,
      is_above_minimum: current >= t.low,
      is_pump_working: !(machineId === M1 && t.n === 8),
      last_refill_at: '2026-08-20T07:00:00Z',
      updated_at: '2026-08-27T09:30:00Z',
      product,
    };
  });
}

export const sampleTanks = [
  ...buildTanks(M1, 't1', [0.72, 0.55, 0.035, 0.61, 0.44, 0.83, 0.29, 0.06]),
  ...buildTanks(M2, 't2', [0.9, 0.78, 0.64, 0.52, 0.71, 0.48, 0.85, 0.33]),
  ...buildTanks(M3, 't3', [0.21, 0.13, 0.48, 0.09, 0.66, 0.37, 0.58, 0.74]),
];

const sale = (o) => ({
  status: 'success',
  dedup_key: null,
  ...o,
  machine: sampleMachines.find((m) => m.id === o.machine_id),
  product: sampleProducts.find((p) => p.id === o.product_id),
});

export const sampleSales = [
  // Caso normal: un solo medio de pago
  sale({ id: 's-1001', machine_id: M1, tank_number: 3, product_id: bySku('CLORO').id, price_paid: 7.0, liters_purchased: 1.0, liters_flow_sensor: 0.998, tank_liters_before: 3.1, tank_liters_after: 2.1, tx_id: 1001, created_at: '2026-08-27T09:12:00Z' }),
  sale({ id: 's-1002', machine_id: M1, tank_number: 5, product_id: bySku('SUAVIZANTE').id, price_paid: 14.0, liters_purchased: 1.0, liters_flow_sensor: 1.004, tank_liters_before: 23.0, tank_liters_after: 22.0, tx_id: 1002, created_at: '2026-08-27T08:41:00Z' }),
  sale({ id: 's-1003', machine_id: M2, tank_number: 1, product_id: bySku('JAB-MANOS').id, price_paid: 15.0, liters_purchased: 1.0, liters_flow_sensor: 0.991, tank_liters_before: 27.5, tank_liters_after: 26.5, tx_id: 1003, created_at: '2026-08-26T17:05:00Z' }),
  // PAGO MIXTO: dos ingresos de tipos distintos con el mismo tx_id
  sale({ id: 's-1004', machine_id: M1, tank_number: 4, product_id: bySku('DESENGRA').id, price_paid: 40.0, liters_purchased: 2.0, liters_flow_sensor: 1.995, tank_liters_before: 32.5, tank_liters_after: 30.5, tx_id: 1004, created_at: '2026-08-26T15:20:00Z' }),
  // DOS INGRESOS DEL MISMO TIPO: debe mostrar "Monedas", no "Mixto"
  sale({ id: 's-1005', machine_id: M1, tank_number: 2, product_id: bySku('LIMP-MULTI').id, price_paid: 15.0, liters_purchased: 1.5, liters_flow_sensor: 1.493, tank_liters_before: 34.5, tank_liters_after: 33.0, tx_id: 1005, created_at: '2026-08-26T12:02:00Z' }),
  // VENTA FALLIDA: nunca genera fila en sale_incomes (el reembolso es implícito)
  sale({ id: 's-1006', machine_id: M1, tank_number: 8, product_id: bySku('DET-TRASTES').id, price_paid: 14.0, liters_purchased: 1.0, liters_flow_sensor: 0.0, tank_liters_before: 1.8, tank_liters_after: 1.8, status: 'fail', tx_id: 1006, created_at: '2026-08-25T19:48:00Z' }),
  // ANOMALIA: venta concretada con tx_id pero sin ingreso registrado
  sale({ id: 's-1007', machine_id: M2, tank_number: 7, product_id: bySku('DET-COLOR').id, price_paid: 13.0, liters_purchased: 1.0, liters_flow_sensor: 1.001, tank_liters_before: 43.0, tank_liters_after: 42.0, tx_id: 1007, created_at: '2026-08-25T11:30:00Z' }),
  // LEGACY: anterior a fw 2.1.0, sin tx_id
  sale({ id: 's-0900', machine_id: M3, tank_number: 6, product_id: bySku('DET-MANCHAS').id, price_paid: 14.0, liters_purchased: 1.0, liters_flow_sensor: 0.997, tank_liters_before: 19.5, tank_liters_after: 18.5, tx_id: null, created_at: '2026-08-18T10:15:00Z' }),
];

const income = (o) => ({
  dedup_key: null,
  ...o,
  machine: sampleMachines.find((m) => m.id === o.machine_id),
});

export const sampleSaleIncomes = [
  income({ id: 'i-1001', machine_id: M1, payment_type: 'monedas', amount: 7.0, tx_id: 1001, created_at: '2026-08-27T09:11:50Z' }),
  income({ id: 'i-1002', machine_id: M1, payment_type: 'efectivo', amount: 20.0, tx_id: 1002, created_at: '2026-08-27T08:40:48Z' }),
  income({ id: 'i-1003', machine_id: M2, payment_type: 'tarjeta', amount: 15.0, tx_id: 1003, created_at: '2026-08-26T17:04:55Z' }),
  income({ id: 'i-1004a', machine_id: M1, payment_type: 'monedas', amount: 15.0, tx_id: 1004, created_at: '2026-08-26T15:19:30Z' }),
  income({ id: 'i-1004b', machine_id: M1, payment_type: 'tarjeta', amount: 25.0, tx_id: 1004, created_at: '2026-08-26T15:19:52Z' }),
  income({ id: 'i-1005a', machine_id: M1, payment_type: 'monedas', amount: 10.0, tx_id: 1005, created_at: '2026-08-26T12:01:30Z' }),
  income({ id: 'i-1005b', machine_id: M1, payment_type: 'monedas', amount: 5.0, tx_id: 1005, created_at: '2026-08-26T12:01:44Z' }),
  // Huérfano: saldo introducido que no llegó a concretar venta
  income({ id: 'i-1099', machine_id: M1, payment_type: 'monedas', amount: 12.5, tx_id: 1099, created_at: '2026-08-27T09:29:00Z' }),
];

export const sampleTankOperations = [
  { id: 'op-01', machine_id: M1, tank_number: 3, product_id: bySku('CLORO').id, operation_type: 'refill', tank_liters_before: 2.1, tank_liters_after: 58.0, net_liters: 55.9, technician_user_id: 'u1111111-1111-1111-1111-111111111111', created_at: '2026-08-20T07:05:00Z', machine: sampleMachines[0], product: bySku('CLORO') },
  { id: 'op-02', machine_id: M1, tank_number: 8, product_id: bySku('DET-TRASTES').id, operation_type: 'purge', tank_liters_before: 4.0, tank_liters_after: 1.8, net_liters: -2.2, technician_user_id: 'u1111111-1111-1111-1111-111111111111', created_at: '2026-08-25T20:10:00Z', machine: sampleMachines[0], product: bySku('DET-TRASTES') },
];

export const sampleMoneyCollections = [
  { id: 'mc-01', machine_id: M1, payment_type: 'monedas', amount_collected: 980.0, status: 'success', collector_user_id: 'u0000000-0000-0000-0000-000000000000', notes: 'Corte de caja semanal', created_at: '2026-08-24T16:00:00Z', machine: sampleMachines[0] },
];

const alert = (o) => ({
  tank_number: null,
  product_id: null,
  value_num1: null,
  value_num2: null,
  value_string: null,
  is_resolved: false,
  resolved_at: null,
  resolved_by: null,
  dedup_key: null,
  ...o,
  machine: sampleMachines.find((m) => m.id === o.machine_id),
  product: o.product_id ? sampleProducts.find((p) => p.id === o.product_id) : null,
});

export const sampleSystemAlerts = [
  // value_string trae SOLO el nombre del producto: obliga a componer la frase
  alert({ id: 'a-01', machine_id: M1, category: 'stock', alert_type: 'low_stock', tank_number: 3, product_id: bySku('CLORO').id, value_num1: 2.1, value_num2: 4.0, value_string: 'Cloro', created_at: '2026-08-27T09:13:00Z' }),
  alert({ id: 'a-02', machine_id: M1, category: 'pump', alert_type: 'pump_disabled', tank_number: 8, product_id: bySku('DET-TRASTES').id, value_string: 'Det. Trastes', created_at: '2026-08-25T19:48:10Z' }),
  alert({ id: 'a-03', machine_id: M1, category: 'sales', alert_type: 'sale_failed', tank_number: 8, product_id: bySku('DET-TRASTES').id, value_num1: 1.0, value_num2: 0.0, created_at: '2026-08-25T19:48:05Z' }),
  alert({ id: 'a-09', machine_id: M1, category: 'pump', alert_type: 'flow_sensor_fail', tank_number: 8, product_id: bySku('DET-TRASTES').id, value_num1: 0.0, value_num2: 1.0, created_at: '2026-08-25T19:48:02Z' }),
  alert({ id: 'a-04', machine_id: M3, category: 'security', alert_type: 'door_open', created_at: '2026-08-26T18:14:00Z' }),
  alert({ id: 'a-05', machine_id: M3, category: 'security', alert_type: 'tilt_detected', created_at: '2026-08-26T18:14:30Z' }),
  alert({ id: 'a-06', machine_id: M2, category: 'security', alert_type: 'coinbox_tampered', value_num1: 45.5, created_at: '2026-08-24T03:12:00Z', is_resolved: true, resolved_at: '2026-08-24T08:40:00Z', resolved_by: 'u1111111-1111-1111-1111-111111111111' }),
  alert({ id: 'a-07', machine_id: M2, category: 'module', alert_type: 'restart', value_string: 'ESP32', created_at: '2026-08-23T05:00:00Z', is_resolved: true, resolved_at: '2026-08-23T05:00:00Z' }),
  // config_ack se inserta ya resuelto por el webhook
  alert({ id: 'a-08', machine_id: M1, category: 'module', alert_type: 'config_ack', value_string: 'req_id=8f14e45f-ceea-467a-9f6b-1d2c3e4a5b6c status=stored restart=pending_5s', created_at: '2026-08-22T13:02:00Z', is_resolved: true, resolved_at: '2026-08-22T13:02:00Z' }),
];

export const sampleProfiles = [
  { id: 'u0000000-0000-0000-0000-000000000000', email: 'admin@limpieziot.mx', full_name: 'Ángel Covarrubias', avatar_url: null, role: 'admin', assigned_machine_ids: [M1, M2, M3], created_at: '2026-07-01T08:00:00Z' },
  { id: 'u9999999-9999-9999-9999-999999999999', email: 'norte@limpieziot.mx', full_name: 'Dirección Zona Norte', avatar_url: null, role: 'admin', assigned_machine_ids: [M3], created_at: '2026-07-02T08:00:00Z' },
  { id: 'u1111111-1111-1111-1111-111111111111', email: 'tecnico@limpieziot.mx', full_name: 'Carlos Mendoza', avatar_url: null, role: 'technician', assigned_machine_ids: [M1], created_at: '2026-07-03T08:00:00Z' },
  { id: 'u2222222-2222-2222-2222-222222222222', email: 'consulta@limpieziot.mx', full_name: 'Laura Ríos', avatar_url: null, role: 'viewer', assigned_machine_ids: [M2], created_at: '2026-07-04T08:00:00Z' },
];
