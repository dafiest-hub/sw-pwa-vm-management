import React, { useEffect, useState } from 'react';
import { getMachines } from '../services/machineService';
import { Cpu, MapPin, Search, ArrowRight, Layers, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Machines = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMachines();
  }, [profile]);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await getMachines(profile?.assigned_machine_ids);
      setMachines(data);
    } catch (err) {
      console.error('Error al cargar máquinas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.location_address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">

      {/* Las máquinas se dan de alta en la base cuando el equipo está construido
          y probado, nunca desde aquí. */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Red de Máquinas Vending</h2>
        <p className="text-xs text-slate-400 mt-0.5">Monitoreo individual de las unidades expendedoras que tienes asignadas</p>
      </div>

      {/* Buscador & Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID de máquina, nombre o ubicación..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-brand-500"
          >
            <option value="all">Todos los estados</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>
      </div>

      {/* Grid de Máquinas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Cargando máquinas...</div>
      ) : machines.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Compass className="w-7 h-7 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No tienes máquinas asignadas</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Sólo se ven las expendedoras que tienes asignadas. Pide al responsable de la plataforma
            que te asigne al menos una.
          </p>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">No se encontraron máquinas con los criterios especificados.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((machine) => {
            const status = machine.machine_status;
            return (
              <div 
                key={machine.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {machine.device_id}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5 line-clamp-1">{machine.name}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      machine.status === 'online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {machine.status}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>{machine.location_address || 'Sin dirección registrada'}</span>
                  </div>

                  {/* Resumen de Tanques */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-400" />
                      <span className="text-slate-300 font-medium">Capacidad</span>
                    </div>
                    <span className="font-bold text-white">8 Tanques de Líquidos</span>
                  </div>

                  {/* Saldos */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Caja Acumulada</span>
                      <span className="font-bold text-emerald-400 text-sm">${Number(status?.stored_cash_balance || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Saldo sin reclamar</span>
                      <span className="font-bold text-brand-300 text-sm">${Number(status?.available_balance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/machines/${machine.id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 border border-brand-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  Ver Detalle & Tanques (8/8)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
