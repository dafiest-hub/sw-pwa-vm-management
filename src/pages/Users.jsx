import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleProfiles } from '../mock/sampleData';
import { getMachines } from '../services/machineService';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, Shield, Crown, Wrench, Eye, Cpu, Check, X, Sliders } from 'lucide-react';

export const Users = () => {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [allMachines, setAllMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Asignar Máquinas
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const machs = await getMachines();
      setAllMachines(machs);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setProfiles(data);
          return;
        }
      }
      setProfiles(sampleProfiles);
    } catch (err) {
      console.error('Error al obtener datos:', err);
      setProfiles(sampleProfiles);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);
        if (error) throw error;
      }
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (err) {
      alert('Error al actualizar rol: ' + err.message);
    }
  };

  const handleOpenAssignModal = (prof) => {
    setSelectedUser(prof);
    setSelectedMachineIds(prof.assigned_machine_ids || []);
  };

  const handleToggleMachine = (machId) => {
    if (selectedMachineIds.includes(machId)) {
      setSelectedMachineIds(selectedMachineIds.filter(id => id !== machId));
    } else {
      setSelectedMachineIds([...selectedMachineIds, machId]);
    }
  };

  const handleSaveAssignedMachines = async () => {
    if (!selectedUser) return;
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({ assigned_machine_ids: selectedMachineIds })
          .eq('id', selectedUser.id);
        if (error) throw error;
      }
      setProfiles(profiles.map(p => p.id === selectedUser.id ? { ...p, assigned_machine_ids: selectedMachineIds } : p));
      setSelectedUser(null);
    } catch (err) {
      alert('Error al guardar asignación de máquinas: ' + err.message);
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
        <h2 className="text-2xl font-black text-white tracking-tight">Gestión de Usuarios, Roles y Máquinas Asignadas</h2>
        <p className="text-xs text-slate-400 mt-0.5">Control de acceso multi-tenant: Restringe qué máquinas específicas puede ver y gestionar cada usuario o administrador</p>
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
                <th className="p-4">Máquinas Visibles / Asignadas</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando perfiles...</td></tr>
              ) : (
                profiles.map((prof) => {
                  const assignedCount = prof.assigned_machine_ids?.length || 0;
                  const isAll = assignedCount === allMachines.length;
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
                          ) : isAll ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                              Todas las máquinas ({assignedCount})
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

                        <button
                          onClick={() => handleOpenAssignModal(prof)}
                          className="px-2.5 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          Asignar Máquinas
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Asignar Máquinas Especificas */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Asignación de Máquinas</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{selectedUser.full_name} ({selectedUser.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Selecciona las máquinas que este usuario tendrá autorizadas para ver y operar en su panel:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allMachines.map((m) => {
                const isSelected = selectedMachineIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    onClick={() => handleToggleMachine(m.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-500/15 border-brand-500/40 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {m.device_id}
                      </span>
                      <span className="text-xs font-bold">{m.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      isSelected ? 'bg-brand-500 border-brand-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAssignedMachines}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-lg shadow-brand-500/20 transition-all"
              >
                Guardar Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
