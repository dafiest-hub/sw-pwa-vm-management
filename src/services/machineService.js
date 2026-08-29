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
 * Reglas de precio y nivel mínimo de un tanque. Viven aquí, en una sola
 * función, porque las comprueban dos capas —el editor mientras se escribe y
 * `saveMachineTankSettings` antes de tocar la base— y si divergieran el editor
 * dejaría guardar algo que el guardado rechaza.
 *
 * Las cuatro reglas salen de restricciones reales, no de gusto:
 *
 *  - **Formato llano.** El parser del firmware es manual (sin `strtof`, por la
 *    restricción de FPU del ESP32) y solo entiende dígitos y punto decimal.
 *    `1e-7` o `15,5` rompen el parseo, y `JSON.stringify` emite notación
 *    exponencial por debajo de 1e-6.
 *  - **Mayor que 0.** El firmware descarta en silencio un valor <= 0 y aun así
 *    responde `ack "stored"`; `mqtt-publisher` responde 400. El CHECK de la
 *    base es `>= 0`, más laxo, así que esta es la única defensa contra el 0:
 *    se guardaría en machine_tanks y jamás llegaría al equipo.
 *  - **Decimales acotados.** `price_per_liter` es NUMERIC(10,2) y
 *    `low_threshold_liters` NUMERIC(8,3): Postgres redondea de más en
 *    silencio, pero el downlink se publica desde el formulario, no desde lo
 *    guardado. Un 15.005 dejaría la base en 15.01 y la máquina en 15.005.
 *  - **Cota superior.** `mqtt-publisher` exige < 1e6 para que la serialización
 *    no se vaya a exponencial.
 *
 * En los cuatro casos el fallo es el mismo: base y máquina discrepantes, con la
 * máquina «Pendiente de sincronizar» de forma permanente.
 */
const LLANO = /^\d+(\.\d+)?$/;
const COTA = 1e6;

const decimalesDe = (s) => {
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
};

function revisarCampo(etiqueta, valor, { maxDecimales }) {
  const raw = String(valor ?? '').trim();
  if (!raw) return `${etiqueta} no puede quedar vacío`;
  if (!LLANO.test(raw))
    return `${etiqueta} solo admite dígitos y punto decimal (sin comas, signos ni notación científica)`;
  const n = Number(raw);
  if (!(n > 0)) return `${etiqueta} debe ser mayor que 0 (la máquina no admite 0)`;
  if (decimalesDe(raw) > maxDecimales)
    return `${etiqueta} admite como máximo ${maxDecimales} decimales (con más, la base y la máquina guardarían valores distintos)`;
  if (n >= COTA) return `${etiqueta} debe ser menor que ${COTA}`;
  return null;
}

/** Problema del tanque, o null si es válido. */
export function validateTankRow(t) {
  const n = t.tank_number;
  const precio = revisarCampo(`T${n}: el precio`, t.price_per_liter, { maxDecimales: 2 });
  if (precio) return precio;

  const minimo = revisarCampo(`T${n}: el nivel mínimo`, t.low_threshold_liters, { maxDecimales: 3 });
  if (minimo) return minimo;

  const m = Number(t.low_threshold_liters);
  const cap = Number(t.capacity_liters);
  if (Number.isFinite(cap) && m > cap)
    return `T${n}: el mínimo (${m} L) supera la capacidad del tanque (${cap} L)`;
  return null;
}

/** Todos los problemas de la máquina, en orden de tanque. */
export function validateTankSettings(tanks) {
  return (tanks || []).map(validateTankRow).filter(Boolean);
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
  // Última barrera antes de escribir: lo mismo que ya comprueba el editor, por
  // si se llama desde otro sitio. Ver validateTankRow para el porqué de cada
  // regla; ninguna la cubre la base, cuyo CHECK es solo `>= 0`.
  const problemas = validateTankSettings(tanks);
  if (problemas.length) throw new Error(problemas.join('. '));

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
 * Reservado a administradores. Dos capas en la base, independientes:
 *
 *  - Política RLS «Edición de ficha de máquina» -> QUÉ FILAS: sólo un admin, y
 *    sólo sobre máquinas que tenga asignadas.
 *  - `grant update (name, location_address)`    -> QUÉ COLUMNAS: el motor
 *    rechaza tocar device_id, status o firmware_version aunque la petición
 *    llegue por la API a mano. RLS es row-level y no sabe de columnas.
 *
 * Ambas en .doc/RLS_MULTITENANT.sql, PASO 4. Sin la política el UPDATE no afecta
 * a ninguna fila y `maybeSingle()` devuelve null —PostgREST NO da error—: por eso
 * se comprueba el resultado y se lanza un error explicativo en vez de dejar
 * creer que se guardó.
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
      'No se guardó ningún cambio: sólo un administrador puede editar la ficha de esta máquina.'
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
