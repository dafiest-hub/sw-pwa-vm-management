import React, { useCallback, useEffect, useState } from 'react';
import { getMachines } from '../services/machineService';
import {
  getProfiles,
  updateProfileRole,
} from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { ErrorState, LoadingState } from '../components/ui/Primitives';
import { Users as UsersIcon, Shield, Crown, Wrench, Eye } from 'lucide-react';

export const Users = () => {
  const { isAdmin, user, profile } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [allMachines, setAllMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getMachines() sólo devuelve las máquinas del propio usuario: aquí se usa
      // únicamente para poner nombre a los ids asignados que se reconozcan.
      const [machs, profs] = await Promise.all([
        getMachines(profile?.assigned_machine_ids),
        getProfiles(),
      ]);
      setAllMachines(machs);
      setProfiles(profs);
    } catch (err) {
      setError(err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.assigned_machine_ids]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (userId, newRole) => {
    // Quitarse a uno mismo el rol admin deja la instalación sin quien administre.
    if (userId === user?.id && newRole !== 'admin') {
      toast.error('No puedes quitarte a ti mismo el rol de administrador.');
      return;
    }
    const previous = profiles;
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p)));
    try {
      await updateProfileRole(userId, newRole);
      toast.success('Rol actualizado.');
    } catch (err) {
      setProfiles(previous);
      toast.error(
        `No se pudo actualizar el rol: ${err.message}. ` +
          'Puede que tu cuenta no tenga permiso para modificar a otros usuarios; avisa al responsable técnico de la plataforma.'
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 space-y-2">
        <Shield className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Acceso Restringido</h3>
        <p className="text-xs text-slate-400">Esta sección solo está disponible para usuarios con rol Administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Gestión de Usuarios y Roles</h2>
        <p className="text-xs text-slate-400 mt-0.5">Cada usuario ve únicamente las máquinas que tiene asignadas, sin excepción por rol</p>
      </div>

      {/* La asignación se hace por SQL a propósito: es la barrera que decide qué
          datos devuelve la base, no un ajuste de interfaz. */}
      <div className="p-3 rounded-2xl bg-surface-raised border border-line-subtle text-[11px] text-content-muted">
        Las máquinas asignadas a cada usuario se configuran directamente en la base de datos. Aquí se
        muestran para consulta; para cambiarlas, contacta con el responsable de la plataforma.
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Usuario / Email</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Máquinas Asignadas</th>
                <th className="p-4">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan="5"><LoadingState label="Cargando perfiles…" /></td></tr>
              ) : error ? (
                <tr><td colSpan="5"><ErrorState error={error} onRetry={loadData} compact /></td></tr>
              ) : (
                profiles.map((prof) => {
                  const assignedCount = prof.assigned_machine_ids?.length || 0;
                  return (
                    <tr key={prof.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-brand-400">
                            {prof.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-white">{prof.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-200">{prof.full_name || 'Sin nombre'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          prof.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          prof.role === 'technician' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {prof.role === 'admin' && <Crown className="w-3 h-3 text-purple-400" />}
                          {prof.role === 'technician' && <Wrench className="w-3 h-3 text-amber-400" />}
                          {prof.role === 'viewer' && <Eye className="w-3 h-3 text-slate-400" />}
                          {prof.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {assignedCount === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                              0 Máquinas (Sin acceso)
                            </span>
                          ) : (
                            prof.assigned_machine_ids.map(mId => {
                              const mObj = allMachines.find(m => m.id === mId);
                              return (
                                <span key={mId} className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-medium">
                                  {mObj?.name || mId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="p-4 space-x-2">
                        <select
                          value={prof.role}
                          onChange={(e) => handleRoleChange(prof.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-semibold focus:outline-none focus:border-brand-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="technician">Technician</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
