import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleMachines, sampleMachineStatus, sampleTanks } from '../mock/sampleData';

export const getMachines = async (assignedIds = null) => {
  let list = [];
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('machines')
      .select(`
        *,
        machine_status (*)
      `)
      .order('created_at', { ascending: false });

    if (assignedIds && Array.isArray(assignedIds)) {
      query = query.in('id', assignedIds);
    }

    const { data: machines, error } = await query;

    if (error) {
      console.warn('Error al cargar máquinas de Supabase, usando datos de respaldo:', error.message);
      list = mergeMockMachinesWithStatus();
    } else {
      list = machines;
    }
  } else {
    list = mergeMockMachinesWithStatus();
  }

  if (assignedIds && Array.isArray(assignedIds)) {
    return list.filter(m => assignedIds.includes(m.id));
  }
  return list;
};

export const getMachineById = async (id) => {
  if (isSupabaseConfigured && supabase) {
    const { data: machine, error } = await supabase
      .from('machines')
      .select(`
        *,
        machine_status (*)
      `)
      .eq('id', id)
      .single();

    if (!error && machine) {
      // Obtener tanques de la máquina
      const { data: tanks } = await supabase
        .from('machine_tanks')
        .select(`
          *,
          product:products (*)
        `)
        .eq('machine_id', id)
        .order('tank_number', { ascending: true });

      return { ...machine, tanks: tanks || [] };
    }
  }

  // Fallback Mock
  const mockMachine = sampleMachines.find(m => m.id === id || m.device_id === id) || sampleMachines[0];
  const mockStatus = sampleMachineStatus.find(s => s.machine_id === mockMachine.id) || sampleMachineStatus[0];
  const mockTanks = sampleTanks.filter(t => t.machine_id === mockMachine.id);

  return {
    ...mockMachine,
    machine_status: mockStatus,
    tanks: mockTanks
  };
};

export const updateTankPrice = async (tankId, newPrice) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('machine_tanks')
      .update({ price_per_liter: newPrice, updated_at: new Date().toISOString() })
      .eq('id', tankId)
      .select();
    if (error) throw error;
    return data;
  }

  // Fallback Mock
  const tank = sampleTanks.find(t => t.id === tankId);
  if (tank) {
    tank.price_per_liter = Number(newPrice);
  }
  return tank;
};

export const createMachine = async (machineData) => {
  if (isSupabaseConfigured && supabase) {
    const { data: machine, error } = await supabase
      .from('machines')
      .insert([{
        device_id: machineData.device_id,
        name: machineData.name,
        location_address: machineData.location_address,
        status: machineData.status || 'online',
        firmware_version: machineData.firmware_version || '1.0.0'
      }])
      .select()
      .single();

    if (error) throw error;

    // Crear machine_status inicial
    await supabase.from('machine_status').insert([{
      machine_id: machine.id,
      available_balance: 0,
      stored_cash_balance: 0,
      door_open: false,
      coinbox_tampered: false,
      tilt_detected: false,
      last_keepalive_at: new Date().toISOString()
    }]);

    return machine;
  }

  // Fallback Mock
  const newMachine = {
    id: `m-${Date.now()}`,
    device_id: machineData.device_id,
    name: machineData.name,
    location_address: machineData.location_address,
    status: machineData.status || 'online',
    firmware_version: machineData.firmware_version || '1.0.0',
    created_at: new Date().toISOString(),
    machine_status: {
      stored_cash_balance: 0,
      available_balance: 0,
      door_open: false,
      coinbox_tampered: false,
      tilt_detected: false
    }
  };
  sampleMachines.unshift(newMachine);
  return newMachine;
};

function mergeMockMachinesWithStatus() {
  return sampleMachines.map(machine => {
    const status = sampleMachineStatus.find(s => s.machine_id === machine.id) || sampleMachineStatus[0];
    const tanks = sampleTanks.filter(t => t.machine_id === machine.id);
    return {
      ...machine,
      machine_status: status,
      tanks_count: tanks.length,
      low_stock_tanks: tanks.filter(t => !t.is_above_minimum).length
    };
  });
}
