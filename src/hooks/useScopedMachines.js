import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMachines } from '../services/machineService';
import { useAuth } from '../context/AuthContext';

/**
 * Máquinas visibles para el usuario actual.
 *
 * Antes sólo Dashboard y Machines respetaban `assigned_machine_ids`: Ventas,
 * Alertas y Operaciones traían el histórico completo, así que un usuario con
 * una sola máquina asignada veía los datos de todas.
 *
 * Nota: esto es coherencia de interfaz, no seguridad. La restricción real tiene
 * que vivir en políticas RLS (ver .doc/REDISENO_2026-08.md).
 */
export function useScopedMachines() {
  const { profile, isAdmin } = useAuth();
  const assigned = profile?.assigned_machine_ids;

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMachines(await getMachines(isAdmin ? null : assigned));
    } catch (e) {
      setError(e);
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, assigned]);

  useEffect(() => {
    load();
  }, [load]);

  const allowedIds = useMemo(() => machines.map((m) => m.id), [machines]);

  /** Traduce el filtro elegido a la lista de ids que puede consultar. */
  const scopeFor = useCallback(
    (selectedId) => {
      if (selectedId) return [selectedId];
      return isAdmin ? undefined : allowedIds;
    },
    [isAdmin, allowedIds]
  );

  return { machines, allowedIds, scopeFor, loading, error, reload: load };
}
