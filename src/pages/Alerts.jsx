import React, { useEffect, useState } from 'react';
import { getAlerts, resolveAlert } from '../services/alertService';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle, ShieldAlert, ZapOff, PackageX, Filter, Check } from 'lucide-react';

export const Alerts = () => {
  const { isTechnician } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      await loadAlerts();
    } catch (err) {
      alert('Error al resolver la alerta: ' + err.message);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'pending' && !a.is_resolved) || 
                          (statusFilter === 'resolved' && a.is_resolved);
    return matchesCategory && matchesStatus;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'security':
        return { label: 'Seguridad Física', icon: ShieldAlert, bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'pump':
        return { label: 'Bomba / Flujo', icon: ZapOff, bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'stock':
        return { label: 'Inventario Líquido', icon: PackageX, bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      default:
        return { label: cat, icon: AlertTriangle, bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Incidencias y Alertas del Sistema</h2>
        <p className="text-xs text-slate-400 mt-0.5">Notificaciones técnicas de seguridad, fallos de dispensado y stock bajo</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold px-2">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filtros:</span>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-brand-500"
        >
          <option value="all">Todas las categorías</option>
          <option value="security">Seguridad Física</option>
          <option value="pump">Bomba / Medidor Flujo</option>
          <option value="stock">Stock Bajo / Nivel</option>
          <option value="sales">Ventas / Monedero</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-brand-500"
        >
          <option value="pending">Solo Pendientes</option>
          <option value="resolved">Solo Resueltas</option>
          <option value="all">Todas las alertas</option>
        </select>
      </div>

      {/* Lista de Alertas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Cargando alertas...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">No hay alertas que coincidan con los filtros seleccionados.</div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((a) => {
            const catInfo = getCategoryBadge(a.category);
            const Icon = catInfo.icon;
            return (
              <div 
                key={a.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  a.is_resolved 
                    ? 'bg-slate-900/60 border-slate-800 text-slate-400' 
                    : 'bg-slate-900 border-amber-500/30 shadow-lg shadow-amber-500/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl border flex-shrink-0 ${catInfo.bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${catInfo.bg}`}>
                        {catInfo.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {a.machine_name || a.machine?.name || 'Máquina Expendedora'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{a.value_string || a.alert_type}</p>
                    <p className="text-[10px] text-slate-400">
                      Registrada: {new Date(a.created_at).toLocaleString('es-MX')}
                      {a.is_resolved && ` • Resuelta: ${new Date(a.resolved_at).toLocaleString('es-MX')}`}
                    </p>
                  </div>
                </div>

                {/* Botón resolver */}
                {!a.is_resolved && isTechnician && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="self-end sm:self-center py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" /> Marcar como Resuelta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
