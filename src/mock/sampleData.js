// Datos de muestra basados rigurosamente en la base de datos de Supabase
// (supabase_db_design.md) para funcionamiento en modo offline / fallback

export const sampleProducts = [
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    sku: 'DET-LIG-001',
    name: 'Detergente Líquido Ropa Concentrado',
    description: 'Detergente de alto rendimiento para ropa blanca y de color con aroma fresco',
    default_price_per_liter: 25.00,
    density_kg_m3: 1040.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p2222222-2222-2222-2222-222222222222',
    sku: 'SUA-FLOR-002',
    name: 'Suavizante de Telas Caricia Floral',
    description: 'Suavizante con microcápsulas de fragancia duradera',
    default_price_per_liter: 22.00,
    density_kg_m3: 1010.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p3333333-3333-3333-3333-333333333333',
    sku: 'CLO-CONC-003',
    name: 'Cloro Blanqueador 6%',
    description: 'Solución desinfectante de hipoclorito de sodio al 6%',
    default_price_per_liter: 15.00,
    density_kg_m3: 1080.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p4444444-4444-4444-4444-444444444444',
    sku: 'LIM-PINO-004',
    name: 'Limpiador Multiusos Aceite de Pino',
    description: 'Limpiador de pisos y superficies con aroma natural a pino',
    default_price_per_liter: 18.00,
    density_kg_m3: 1005.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p5555555-5555-5555-5555-555555555555',
    sku: 'DES-CITR-005',
    name: 'Desengrasante Biodegradable Cítrico',
    description: 'Formulación de alta efectividad para grasa pesada en cocina',
    default_price_per_liter: 30.00,
    density_kg_m3: 1025.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p6666666-6666-6666-6666-666666666666',
    sku: 'JAB-MANO-006',
    name: 'Jabón Líquido Manos Humectante',
    description: 'Jabón para manos con aloe vera y glicerina',
    default_price_per_liter: 28.00,
    density_kg_m3: 1030.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p7777777-7777-7777-7777-777777777777',
    sku: 'LIM-VIDR-007',
    name: 'Limpiador de Vidrios y Cristales',
    description: 'Fórmula antiestática de secado rápido sin manchas',
    default_price_per_liter: 20.00,
    density_kg_m3: 998.00,
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'p8888888-8888-8888-8888-888888888888',
    sku: 'DES-QUAT-008',
    name: 'Desinfectante Cuaternario de 5ta Gen',
    description: 'Desinfectante virucida y bactericida sin enjuague',
    default_price_per_liter: 35.00,
    density_kg_m3: 1015.00,
    created_at: '2026-08-01T10:00:00Z'
  }
];

export const sampleMachines = [
  {
    id: 'm1111111-1111-1111-1111-111111111111',
    device_id: 'esp32_vending_01',
    name: 'Expendedora Central Plaza Tec',
    location_address: 'Av. Tecnológico #4500, Modulo de Lavanderías, Col. Centro',
    latitude: 20.6736,
    longitude: -103.3440,
    status: 'online',
    firmware_version: '2.0.0',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-06T19:30:00Z'
  },
  {
    id: 'm2222222-2222-2222-2222-222222222222',
    device_id: 'esp32_vending_02',
    name: 'Expendedora Residencial Las Palmas',
    location_address: 'Calle Palmas #12, Frente a Administración',
    latitude: 20.6800,
    longitude: -103.3500,
    status: 'online',
    firmware_version: '2.0.0',
    created_at: '2026-08-02T09:00:00Z',
    updated_at: '2026-08-06T19:28:00Z'
  },
  {
    id: 'm3333333-3333-3333-3333-333333333333',
    device_id: 'esp32_vending_03',
    name: 'Expendedora Universidad Campus Sur',
    location_address: 'Edificio E, Cafetería General',
    latitude: 20.6500,
    longitude: -103.3300,
    status: 'maintenance',
    firmware_version: '1.9.4',
    created_at: '2026-08-03T11:00:00Z',
    updated_at: '2026-08-06T18:15:00Z'
  }
];

export const sampleMachineStatus = [
  {
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    available_balance: 5.00,
    stored_cash_balance: 845.00,
    door_open: false,
    coinbox_tampered: false,
    tilt_detected: false,
    last_keepalive_at: '2026-08-06T19:31:00Z',
    updated_at: '2026-08-06T19:31:00Z'
  },
  {
    machine_id: 'm2222222-2222-2222-2222-222222222222',
    available_balance: 0.00,
    stored_cash_balance: 1420.00,
    door_open: false,
    coinbox_tampered: false,
    tilt_detected: false,
    last_keepalive_at: '2026-08-06T19:29:00Z',
    updated_at: '2026-08-06T19:29:00Z'
  },
  {
    machine_id: 'm3333333-3333-3333-3333-333333333333',
    available_balance: 10.00,
    stored_cash_balance: 320.00,
    door_open: true,
    coinbox_tampered: false,
    tilt_detected: false,
    last_keepalive_at: '2026-08-06T18:15:00Z',
    updated_at: '2026-08-06T18:15:00Z'
  }
];

export const sampleTanks = [
  // Máquina 1 (8 Tanques)
  {
    id: 't101',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 1,
    product_id: 'p1111111-1111-1111-1111-111111111111',
    price_per_liter: 25.00,
    capacity_liters: 20.000,
    current_liters: 14.500,
    low_threshold_liters: 3.000,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-05T14:00:00Z',
    product: sampleProducts[0]
  },
  {
    id: 't102',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 2,
    product_id: 'p2222222-2222-2222-2222-222222222222',
    price_per_liter: 22.00,
    capacity_liters: 20.000,
    current_liters: 18.200,
    low_threshold_liters: 3.000,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-05T14:10:00Z',
    product: sampleProducts[1]
  },
  {
    id: 't103',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 3,
    product_id: 'p3333333-3333-3333-3333-333333333333',
    price_per_liter: 15.00,
    capacity_liters: 20.000,
    current_liters: 2.100,
    low_threshold_liters: 3.000,
    is_above_minimum: false,
    is_pump_working: true,
    last_refill_at: '2026-08-02T10:00:00Z',
    product: sampleProducts[2]
  },
  {
    id: 't104',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 4,
    product_id: 'p4444444-4444-4444-4444-444444444444',
    price_per_liter: 18.00,
    capacity_liters: 20.000,
    current_liters: 11.000,
    low_threshold_liters: 3.000,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-04T12:00:00Z',
    product: sampleProducts[3]
  },
  {
    id: 't105',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 5,
    product_id: 'p5555555-5555-5555-5555-555555555555',
    price_per_liter: 30.00,
    capacity_liters: 15.000,
    current_liters: 9.500,
    low_threshold_liters: 2.500,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-04T12:15:00Z',
    product: sampleProducts[4]
  },
  {
    id: 't106',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 6,
    product_id: 'p6666666-6666-6666-6666-666666666666',
    price_per_liter: 28.00,
    capacity_liters: 15.000,
    current_liters: 13.000,
    low_threshold_liters: 2.500,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-04T12:30:00Z',
    product: sampleProducts[5]
  },
  {
    id: 't107',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 7,
    product_id: 'p7777777-7777-7777-7777-777777777777',
    price_per_liter: 20.00,
    capacity_liters: 15.000,
    current_liters: 7.800,
    low_threshold_liters: 2.500,
    is_above_minimum: true,
    is_pump_working: true,
    last_refill_at: '2026-08-04T12:45:00Z',
    product: sampleProducts[6]
  },
  {
    id: 't108',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 8,
    product_id: 'p8888888-8888-8888-8888-888888888888',
    price_per_liter: 35.00,
    capacity_liters: 15.000,
    current_liters: 1.200,
    low_threshold_liters: 2.500,
    is_above_minimum: false,
    is_pump_working: false, // Fallo de bomba registrado en alerta
    last_refill_at: '2026-08-01T08:30:00Z',
    product: sampleProducts[7]
  }
];

export const sampleSales = [
  {
    id: 's1111111-1111-1111-1111-111111111111',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 1,
    product_id: 'p1111111-1111-1111-1111-111111111111',
    price_paid: 15.00,
    liters_purchased: 0.600,
    liters_flow_sensor: 0.6012,
    tank_liters_before: 15.100,
    tank_liters_after: 14.500,
    status: 'success',
    created_at: '2026-08-06T18:45:00Z',
    product: sampleProducts[0],
    machine_name: 'Expendedora Central Plaza Tec'
  },
  {
    id: 's2222222-2222-2222-2222-222222222222',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 2,
    product_id: 'p2222222-2222-2222-2222-222222222222',
    price_paid: 22.00,
    liters_purchased: 1.000,
    liters_flow_sensor: 1.0025,
    tank_liters_before: 19.200,
    tank_liters_after: 18.200,
    status: 'success',
    created_at: '2026-08-06T17:12:00Z',
    product: sampleProducts[1],
    machine_name: 'Expendedora Central Plaza Tec'
  },
  {
    id: 's3333333-3333-3333-3333-333333333333',
    machine_id: 'm2222222-2222-2222-2222-222222222222',
    tank_number: 4,
    product_id: 'p4444444-4444-4444-4444-444444444444',
    price_paid: 36.00,
    liters_purchased: 2.000,
    liters_flow_sensor: 1.9980,
    tank_liters_before: 14.000,
    tank_liters_after: 12.000,
    status: 'success',
    created_at: '2026-08-06T15:30:00Z',
    product: sampleProducts[3],
    machine_name: 'Expendedora Residencial Las Palmas'
  }
];

export const sampleSaleIncomes = [
  {
    id: 'i1111111-1111-1111-1111-111111111111',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    payment_type: 'monedas',
    amount: 15.00,
    created_at: '2026-08-06T18:45:00Z'
  },
  {
    id: 'i2222222-2222-2222-2222-222222222222',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    payment_type: 'efectivo',
    amount: 20.00,
    created_at: '2026-08-06T17:12:00Z'
  },
  {
    id: 'i3333333-3333-3333-3333-333333333333',
    machine_id: 'm2222222-2222-2222-2222-222222222222',
    payment_type: 'tarjeta',
    amount: 36.00,
    created_at: '2026-08-06T15:30:00Z'
  }
];

export const sampleTankOperations = [
  {
    id: 'op111111-1111-1111-1111-111111111111',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 1,
    product_id: 'p1111111-1111-1111-1111-111111111111',
    operation_type: 'refill',
    tank_liters_before: 2.100,
    tank_liters_after: 20.000,
    net_liters: 17.900,
    technician_user_id: 'u1111111-1111-1111-1111-111111111111',
    technician_name: 'Ing. Carlos Mendoza (Técnico)',
    created_at: '2026-08-05T14:00:00Z'
  },
  {
    id: 'op222222-2222-2222-2222-222222222222',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    tank_number: 3,
    product_id: 'p3333333-3333-3333-3333-333333333333',
    operation_type: 'purge',
    tank_liters_before: 5.000,
    tank_liters_after: 0.000,
    net_liters: -5.000,
    technician_user_id: 'u1111111-1111-1111-1111-111111111111',
    technician_name: 'Ing. Carlos Mendoza (Técnico)',
    created_at: '2026-08-02T09:30:00Z'
  }
];

export const sampleMoneyCollections = [
  {
    id: 'mc111111-1111-1111-1111-111111111111',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    payment_type: 'monedas',
    amount_collected: 500.00,
    status: 'success',
    collector_user_id: 'u1111111-1111-1111-1111-111111111111',
    collector_name: 'Ing. Carlos Mendoza',
    notes: 'Corte semanal de caja de monedas. Depósito en sucursal.',
    created_at: '2026-08-04T16:00:00Z'
  }
];

export const sampleSystemAlerts = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    machine_name: 'Expendedora Central Plaza Tec',
    category: 'stock',
    alert_type: 'low_stock_warning',
    tank_number: 3,
    product_id: 'p3333333-3333-3333-3333-333333333333',
    product_name: 'Cloro Blanqueador 6%',
    value_num1: 2.10, // Litros actuales
    value_num2: 3.00, // Umbral mínimo
    value_string: 'Tanque 3 por debajo del umbral de reserva (2.10L / 3.00L)',
    is_resolved: false,
    resolved_at: null,
    created_at: '2026-08-06T14:20:00Z'
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    machine_id: 'm1111111-1111-1111-1111-111111111111',
    machine_name: 'Expendedora Central Plaza Tec',
    category: 'pump',
    alert_type: 'pump_flow_discrepancy',
    tank_number: 8,
    product_id: 'p8888888-8888-8888-8888-888888888888',
    product_name: 'Desinfectante Cuaternario de 5ta Gen',
    value_num1: 0.00,
    value_num2: 0.50,
    value_string: 'Bomba 8 no generó pulsos en medidor de flujo durante surtido',
    is_resolved: false,
    resolved_at: null,
    created_at: '2026-08-06T16:05:00Z'
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    machine_id: 'm3333333-3333-3333-3333-333333333333',
    machine_name: 'Expendedora Universidad Campus Sur',
    category: 'security',
    alert_type: 'door_open_warning',
    tank_number: null,
    product_id: null,
    product_name: null,
    value_num1: 1.00,
    value_num2: null,
    value_string: 'Puerta principal abierta fuera de ventana de mantenimiento',
    is_resolved: false,
    resolved_at: null,
    created_at: '2026-08-06T18:15:00Z'
  }
];

export const sampleProfiles = [
  {
    id: 'u0000000-0000-0000-0000-000000000000',
    email: 'admin.limpieziot@vendingapp.com',
    full_name: 'Administrador General (Super Admin)',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'admin',
    assigned_machine_ids: ['m1111111-1111-1111-1111-111111111111', 'm2222222-2222-2222-2222-222222222222', 'm3333333-3333-3333-3333-333333333333'],
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'u3333333-3333-3333-3333-333333333333',
    email: 'admin.norte@vendingapp.com',
    full_name: 'Admin Sucursal Norte',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: 'admin',
    assigned_machine_ids: ['m3333333-3333-3333-3333-333333333333'],
    created_at: '2026-08-02T00:00:00Z'
  },
  {
    id: 'u1111111-1111-1111-1111-111111111111',
    email: 'carlos.mendoza@vendingapp.com',
    full_name: 'Ing. Carlos Mendoza (Técnico Zona 1)',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'technician',
    assigned_machine_ids: ['m1111111-1111-1111-1111-111111111111'],
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'u2222222-2222-2222-2222-222222222222',
    email: 'observador@vendingapp.com',
    full_name: 'Laura Gómez (Auditora Las Palmas)',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'viewer',
    assigned_machine_ids: ['m2222222-2222-2222-2222-222222222222'],
    created_at: '2026-08-01T00:00:00Z'
  }
];
