/**
 * Estado de sincronización de configuración con las máquinas.
 *
 * No existe ninguna columna en la base que refleje "config pendiente/aplicada"
 * (ver .doc/REDISENO_2026-08.md §4), así que se persiste localmente para que el
 * aviso "Pendiente de sincronizar" sobreviva a un recargado de página.
 */
const KEY = 'limpieziot.pendingSync';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* almacenamiento no disponible (modo privado): el badge se pierde al recargar */
  }
}

export function markPendingSync(machineId, payload) {
  if (!machineId) return;
  const all = readAll();
  all[machineId] = { at: new Date().toISOString(), ...payload };
  writeAll(all);
}

export function clearPendingSync(machineId) {
  const all = readAll();
  delete all[machineId];
  writeAll(all);
}

export const getPendingSync = (machineId) => readAll()[machineId] || null;
