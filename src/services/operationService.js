import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleTankOperations, sampleMoneyCollections, sampleTanks } from '../mock/sampleData';

export const getTankOperations = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tank_operations')
      .select(`
        *,
        product:products (*),
        machine:machines (name, device_id),
        technician:public.profiles (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!error) return data;
  }
  return sampleTankOperations;
};

export const getMoneyCollections = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('money_collections')
      .select(`
        *,
        machine:machines (name, device_id),
        collector:public.profiles (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!error) return data;
  }
  return sampleMoneyCollections;
};

export const recordRefillOperation = async ({ machine_id, tank_number, product_id, liters_added, technician_id }) => {
  if (isSupabaseConfigured && supabase) {
    // 1. Consultar estado actual del tanque
    const { data: tank } = await supabase
      .from('machine_tanks')
      .select('*')
      .eq('machine_id', machine_id)
      .eq('tank_number', tank_number)
      .single();

    const before = tank ? Number(tank.current_liters) : 0;
    const after = Math.min(Number(tank?.capacity_liters || 20), before + Number(liters_added));

    // 2. Insertar registro de operacion
    const { data: op, error: opErr } = await supabase
      .from('tank_operations')
      .insert([{
        machine_id,
        tank_number,
        product_id,
        operation_type: 'refill',
        tank_liters_before: before,
        tank_liters_after: after,
        technician_user_id: technician_id
      }])
      .select();

    if (opErr) throw opErr;

    // 3. Actualizar tanque
    await supabase
      .from('machine_tanks')
      .update({
        current_liters: after,
        is_above_minimum: after >= (tank?.low_threshold_liters || 3),
        last_refill_at: new Date().toISOString()
      })
      .eq('id', tank.id);

    return op[0];
  }

  // Fallback Mock
  const tank = sampleTanks.find(t => t.machine_id === machine_id && t.tank_number === tank_number);
  const before = tank ? tank.current_liters : 0;
  const after = Math.min(tank ? tank.capacity_liters : 20, before + Number(liters_added));

  if (tank) {
    tank.current_liters = after;
    tank.is_above_minimum = after >= tank.low_threshold_liters;
    tank.last_refill_at = new Date().toISOString();
  }

  const newOp = {
    id: `op${Date.now()}`,
    machine_id,
    tank_number,
    product_id,
    operation_type: 'refill',
    tank_liters_before: before,
    tank_liters_after: after,
    net_liters: after - before,
    technician_name: 'Usuario Actual',
    created_at: new Date().toISOString()
  };
  sampleTankOperations.unshift(newOp);
  return newOp;
};
