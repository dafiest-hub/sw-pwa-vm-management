import { query, mutate } from '../lib/dataAccess';
import { sampleProfiles } from '../mock/sampleData';

const PROFILE_SELECT = 'id, email, full_name, avatar_url, role, assigned_machine_ids, created_at';

export async function getProfiles() {
  return query(
    'profiles.getProfiles',
    (sb) => sb.from('profiles').select(PROFILE_SELECT).order('full_name', { ascending: true }),
    () => [...sampleProfiles]
  );
}

/**
 * Directorio id -> perfil, con caché de 5 min.
 * Sustituye a los embeds `technician:profiles(...)` / `collector:profiles(...)`,
 * que no eran sintaxis válida de PostgREST.
 */
let cache = { at: 0, map: null };
const TTL = 5 * 60 * 1000;

export async function getProfileDirectory({ force = false } = {}) {
  if (!force && cache.map && Date.now() - cache.at < TTL) return cache.map;
  const rows = await getProfiles();
  cache = { at: Date.now(), map: new Map(rows.map((p) => [p.id, p])) };
  return cache.map;
}

export const invalidateProfileDirectory = () => {
  cache = { at: 0, map: null };
};

export async function updateProfileRole(userId, role) {
  invalidateProfileDirectory();
  return mutate(
    'profiles.updateProfileRole',
    (sb) => sb.from('profiles').update({ role }).eq('id', userId).select().maybeSingle(),
    () => {
      const p = sampleProfiles.find((x) => x.id === userId);
      if (p) p.role = role;
      return p;
    }
  );
}

/*
 * Aquí vivía `updateAssignedMachines()`. Las asignaciones se hacen por SQL: son
 * la barrera que decide qué datos devuelve la base (.doc/RLS_MULTITENANT.sql),
 * no un ajuste de interfaz, y en producción deben quedar auditadas.
 */
