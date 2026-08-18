import React, { useEffect, useState } from 'react';
import { getMachines, createMachine } from '../services/machineService';
import { Cpu, MapPin, Search, ArrowRight, Layers, Plus, X, CheckCircle2, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Machines = () => {
  const { profile, isTechnician } = useAuth();
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Estado del Modal de Registro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    location_address: '',
    status: 'online'
  });

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

  const handleOpenModal = () => {
    setFormData({
      device_id: `VM-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      location_address: '',
      status: 'online'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmitNewMachine = async (e) => {
    e.preventDefault();
    if (!formData.device_id || !formData.name) {
      setErrorMsg('El ID del dispositivo y el nombre de la máquina son obligatorios.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await createMachine(formData);
      setIsModalOpen(false);
      await loadMachines();
    } catch (err) {
      console.error('Error al registrar máquina:', err);
      setErrorMsg(err.message || 'Error al guardar la máquina en la base de datos.');
    } finally {
      setSubmitting(false);
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
      {/* Guía de Ubicación de Menú Actual */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold shadow-sm">
          <Compass className="w-4 h-4 text-brand-400" />
          <span>Menú Actual: <strong className="text-white">Red de Máquinas Vending</strong></span>
        </div>
      </div>

      {/* Header & Botón Registrar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Red de Máquinas Vending</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión y monitoreo individual de las unidades expendedoras</p>
        </div>

        {isTechnician && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Registrar Nueva Máquina
          </button>
        )}
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

      {/* Modal Formulario de Registro de Máquina */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Registrar Nueva Máquina</h3>
                <p className="text-xs text-slate-400">Agrega una nueva expendedora a la base de datos</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitNewMachine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ID del Dispositivo</label>
                <input
                  type="text"
                  required
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  placeholder="Ej. VM-104"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Máquina</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Expendedora Plaza Central"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dirección / Ubicación</label>
                <input
                  type="text"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  placeholder="Ej. Av. Reforma #120, Col. Juárez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Estado Inicial</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="online">Online (Operativa)</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Guardando...' : 'Guardar Máquina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
