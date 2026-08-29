import { query, mutate, IS_DEMO } from '../lib/dataAccess';
import { supabase } from '../lib/supabaseClient';
import { markPendingSync, clearPendingSync, getPendingSync } from '../lib/pendingSync';
import { sampleMachines, sampleMachineStatus, sampleTanks } from '../mock/sampleData';

const MACHINE_SELECT = '*, machine_status (*)';

/** PostgREST devuelve las relaciones 1-N como array aunque sean 1:1. */
const normalizeStatus = (m) => ({
  ...m,
  machine_status: Array.isArray(m.machine_status) ? m.machine_status[0] || null : m.machine_status,
});

function demoMachines() {
  return sampleMachines.map((m) => {
    const tanks = sampleTanks.filter((t) => t.machine_id === m.id);
    return {
      ...m,
      machine_status: sampleMachineStatus.find((s) => s.machine_id === m.id) || null,
      tanks_count: tanks.length,
      low_stock_tanks: tanks.filter((t) => !t.is_above_minimum).length,
    };
  });
}

export async function getMachines(assignedIds = null) {
  const machines = await query(
    'machines.getMachines',
    (sb) => {
      let q = sb.from('machines').select(MACHINE_SELECT);
      if (Array.isArray(assignedIds) && assignedIds.length) q = q.in('id', assignedIds);
      return q.order('name', { ascending: true });
    },
    () => {
      const all = demoMachines();
      return Array.isArray(assignedIds) && assignedIds.length
        ? all.filter((m) => assignedIds.includes(m.id))
        : all;
    }
  );
  return IS_DEMO ? machines : machines.map(normalizeStatus);
}

export async function getMachineTanks(machineId) {
  return query(
    'machines.getMachineTanks',
    (sb) =>
      sb
        .from('machine_tanks')
        .select('*, product:products (*)')
        .eq('machine_id', machineId)
        .order('tank_number', { ascending: true }),
    () =>
      sampleTanks
        .filter((t) => t.machine_id === machineId)
        .sort((a, b) => a.tank_number - b.tank_number)
  );
}

export async function getMachineById(id) {
  const machine = await query(
    'machines.getMachineById',
    (sb) => sb.from('machines').select(MACHINE_SELECT).eq('id', id).maybeSingle(),
    () => {
      const m =
        sampleMachines.find((x) => x.id === id || x.device_id === id) || sampleMachines[0];
      return { ...m, machine_status: sampleMachineStatus.find((s) => s.machine_id === m.id) || null };
    }
  );
  if (!machine) return null;

  const normalized = IS_DEMO ? machine : normalizeStatus(machine);
  const tanks = await getMachineTanks(normalized.id);
  return { ...normalized, tanks };
}

/**
 * Guarda precio y nivel mínimo de los 8 tanques de una máquina y publica la
 * configuración al equipo.
 *
 * Dos decisiones importantes:
 *
 *  - Se usan 8 UPDATE, NO un upsert. PostgREST traduce upsert a
 *    "INSERT ... ON CONFLICT DO UPDATE", y PostgreSQL valida los NOT NULL de la
 *    tupla ANTES de detectar el conflicto: fallaría por capacity_liters y
 *    product_id ausentes.
 *  - current_percentage es GENERATED: escribirla da error, nunca se envía.
 *
 * El downlink es best-effort: si `mqtt-publisher` no está desplegada (hoy no lo
 * está), el guardado en base NO se revierte y la máquina queda marcada como
 * pendiente de sincronizar.
 */
export async function saveMachineTankSettings(machineId, tanks, { deviceId } = {}) {
  // El firmware descarta en silencio price_per_liter/low_threshold_liters <= 0 y
  // la función de publicación responde 400. Si dejáramos pasar un 0 se guardaría
  // en machine_tanks pero nunca llegaría al equipo: la base y la máquina
  // quedarían discrepantes y la máquina «Pendiente de sincronizar» para siempre,
  // con el reintento manual fallando igual. Por eso aquí es > 0, no >= 0.
  const invalid = tanks.find(
    (t) =>
      !(Number(t.price_per_liter) > 0) ||
      !(Number(t.low_threshold_liters) > 0) ||
      Number(t.low_threshold_liters) > Number(t.capacity_liters)
  );
  if (invalid) {
    throw new Error(
      `Tanque ${invalid.tank_number}: el precio y el nivel mínimo deben ser mayores que 0 (el firmware no admite 0) y el nivel mínimo no puede superar la capacidad (${invalid.capacity_liters} L).`
    );
  }

  const payloadFor = (t) => ({
    price_per_liter: Number(t.price_per_liter),
    low_threshold_liters: Number(t.low_threshold_liters),
    // Si sube el umbral, el semáforo tiene que recalcularse o mentiría.
    is_above_minimum: Number(t.current_liters) >= Number(t.low_threshold_liters),
    updated_at: new Date().toISOString(),
  });

  let results;
  if (IS_DEMO) {
    results = tanks.map((t) => {
      const row = sampleTanks.find((x) => x.id === t.id);
      if (row) Object.assign(row, payloadFor(t));
      return { tank_number: t.tank_number, ok: true };
    });
  } else {
    const settled = await Promise.allSettled(
      tanks.map((t) =>
        supabase
          .from('machine_tanks')
          .update(payloadFor(t))
          .eq('id', t.id)
          .select('id')
          .maybeSingle()
          .then(({ error }) => {
            if (error) throw error;
            return true;
          })
      )
    );
    results = settled.map((r, i) => ({
      tank_number: tanks[i].tank_number,
      ok: r.status === 'fulfilled',
      error: r.status === 'rejected' ? r.reason?.message : null,
    }));
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      throw new Error(
        `No se pudieron guardar ${failed.length} de ${tanks.length} tanques (${failed.map((f) => `T${f.tank_number}`).join(', ')}).`
      );
    }
  }

  const sync = await publishTankConfig(machineId, deviceId, tanks);
  return { saved: true, results, sync };
}

/**
 * Publica {device_id}/config/prices vía la Edge Function `mqtt-publisher`.
 *
 * El firmware NO acepta actualización parcial: se envían siempre los 8 tanques,
 * con `price` y `min_level_liters` como números JSON planos (su parser es
 * manual, no entiende comillas ni notación exponencial).
 */
export async function publishTankConfig(machineId, deviceId, tanks) {
  const at = new Date().toISOString();

  if (IS_DEMO) return { status: 'demo', at };

  const body = {
    device_id: deviceId,
    tanks: tanks
      .slice()
      .sort((a, b) => a.tank_number - b.tank_number)
      .map((t) => ({
        id: Number(t.tank_number),
        price: Number(t.price_per_liter),
        min_level_liters: Number(t.low_threshold_liters),
      })),
  };

  try {
    const { data, error } = await supabase.functions.invoke('mqtt-publisher', { body });
    if (error) throw error;
    clearPendingSync(machineId);
    return { status: 'synced', at, req_id: data?.req_id || null };
  } catch (e) {
    console.warn(
      `[machines.publishTankConfig] No se pudo publicar la configuración: ${e?.message || e}. ` +
        'Los datos SÍ quedaron guardados en la base.'
    );
    markPendingSync(machineId, { at, tanks: body.tanks, error: e?.message || String(e) });
    return { status: 'pending', at, error: e?.message || 'Edge Function no disponible' };
  }
}

export const readPendingSync = getPendingSync;

export async function createMachine(machineData) {
  const machine = await mutate(
    'machines.createMachine',
    (sb) =>
      sb
        .from('machines')
        .insert([
          {
            device_id: machineData.device_id,
            name: machineData.name,
            location_address: machineData.location_address,
            status: machineData.status || 'online',
            firmware_version: machineData.firmware_version || '2.1.0',
          },
        ])
        .select()
        .single(),
    () => {
      const nueva = {
        id: `m-${Date.now()}`,
        ...machineData,
        status: machineData.status || 'online',
        firmware_version: machineData.firmware_version || '2.1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        machine_status: null,
        tanks_count: 0,
        low_stock_tanks: 0,
      };
      sampleMachines.unshift(nueva);
      return nueva;
    }
  );

  if (!IS_DEMO && machine?.id) {
    const { error } = await supabase.from('machine_status').insert([
      {
        machine_id: machine.id,
        available_balance: 0,
        stored_cash_balance: 0,
        door_open: false,
        coinbox_tampered: false,
        tilt_detected: false,
        last_keepalive_at: new Date().toISOString(),
      },
    ]);
    if (error) console.error(`[machines.createMachine/status] ${error.code} — ${error.message}`);
  }
  return machine;
}
