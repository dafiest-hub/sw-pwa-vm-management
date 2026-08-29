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

/**
 * Máquinas visibles para un usuario, SIEMPRE acotadas a las que tiene asignadas.
 *
 * Sin asignación no se ve ninguna máquina, y eso vale **también para los
 * administradores**: no hay excepción por rol. Antes, una lista vacía o nula
 * significaba "no filtres" y devolvía la red entera, justo lo contrario de lo
 * que dice la pantalla de perfil.
 *
 * La restricción de verdad está en la RLS (.doc/RLS_MULTITENANT.sql); esto es la
 * mitad de interfaz, para no pedir a la base lo que ya se sabe que no toca.
 */
export async function getMachines(assignedIds = null) {
  const ids = Array.isArray(assignedIds) ? assignedIds : [];
  if (!ids.length) return [];

  const machines = await query(
    'machines.getMachines',
    (sb) =>
      sb
        .from('machines')
        .select(MACHINE_SELECT)
        .in('id', ids)
        .order('name', { ascending: true }),
    () => demoMachines().filter((m) => ids.includes(m.id))
  );
  return IS_DEMO() ? machines : machines.map(normalizeStatus);
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

  const normalized = IS_DEMO() ? machine : normalizeStatus(machine);
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
      `Tanque ${invalid.tank_number}: el precio y el nivel mínimo deben ser mayores que 0 (la máquina no admite 0) y el nivel mínimo no puede superar la capacidad (${invalid.capacity_liters} L).`
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
  if (IS_DEMO()) {
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

  if (IS_DEMO()) return { status: 'demo', at };

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

/**
 * Renombra una máquina y/o cambia su ubicación. Es lo ÚNICO editable de la ficha
 * desde la PWA: `device_id`, `status` y `firmware_version` los publica el propio
 * equipo, y el alta sigue siendo cosa de la base.
 *
 * Requiere la política RLS «Edición de ficha de máquina»
 * (.doc/RLS_MULTITENANT.sql, PASO 4). Sin ella el UPDATE no afecta a ninguna
 * fila y `maybeSingle()` devuelve null: por eso se comprueba el resultado y se
 * lanza un error explicativo en vez de dejar creer que se guardó.
 */
export async function updateMachineInfo(machineId, { name, location_address }) {
  const nombre = String(name ?? '').trim();
  if (!nombre) throw new Error('El nombre de la máquina no puede quedar vacío.');

  const updated = await mutate(
    'machines.updateMachineInfo',
    (sb) =>
      sb
        .from('machines')
        .update({
          name: nombre,
          location_address: String(location_address ?? '').trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', machineId)
        .select('id, name, location_address')
        .maybeSingle(),
    () => {
      const m = sampleMachines.find((x) => x.id === machineId);
      if (m) Object.assign(m, {
        name: nombre,
        location_address: String(location_address ?? '').trim() || null,
        updated_at: new Date().toISOString(),
      });
      return m;
    }
  );

  if (!updated) {
    throw new Error(
      'No se guardó ningún cambio: tu cuenta no tiene permiso para editar esta máquina.'
    );
  }
  return updated;
}

/*
 * Aquí vivía `createMachine()`. El alta de máquinas sale de la PWA a propósito:
 * una expendedora se da de alta en la base cuando el equipo está construido y
 * probado, junto con sus 8 filas de machine_tanks y su machine_status. Crearla
 * desde la interfaz dejaba una máquina sin tanques que rompía las pantallas de
 * detalle, y en producción es una operación que debe quedar auditada en SQL.
 * Lo mismo vale para asignarla a un usuario: `assigned_machine_ids` se rellena
 * por SQL (ver .doc/RLS_MULTITENANT.sql).
 */
