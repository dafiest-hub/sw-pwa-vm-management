import React, { useEffect, useState } from 'react';
import { getMachines } from '../services/machineService';
import { getFinancialSummary, getSalesHistory } from '../services/salesService';
import { getAlerts } from '../services/alertService';
import { StatCard } from '../components/common/StatCard';
import { 
  DollarSign, 
  Cpu, 
  AlertTriangle, 
  Droplet, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  Activity,
  TrendingUp,
  LayoutDashboard,
  Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState([]);
  const [finance, setFinance] = useState({ totalIncome: 0, totalLiters: 0, byPaymentType: {} });
  const [alerts, setAlerts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [machData, finData, alertData, salesData] = await Promise.all([
        getMachines(profile?.assigned_machine_ids),
        getFinancialSummary(),
        getAlerts(),
        getSalesHistory()
      ]);
      setMachines(machData);
      setFinance(finData);
      setAlerts(alertData);
      setSales(salesData);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const onlineCount = machines.filter(m => m.status === 'online').length;
  const activeAlertsCount = alerts.filter(a => !a.is_resolved).length;
  
  // Datos para gráfica por método de pago
  const paymentChartData = [
    { name: 'Monedas', amount: finance.byPaymentType?.monedas || 0, color: '#0284c7' },
    { name: 'Efectivo', amount: finance.byPaymentType?.efectivo || 0, color: '#10b981' },
    { name: 'Tarjeta', amount: finance.byPaymentType?.tarjeta || 0, color: '#8b5cf6' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Cargando métricas de telemetría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Dashboard de Monitoreo</h2>
          <p className="text-xs text-slate-400 mt-0.5">Resumen operativo y telemetría de la red de máquinas vending</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
        >
          <Activity className="w-4 h-4 text-brand-400" />
          Actualizar Datos
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos Totales"
          value={`$${finance.totalIncome.toFixed(2)} MXN`}
          subtitle={`${finance.totalLiters.toFixed(2)} Litros Surtidos`}
          icon={DollarSign}
          color="emerald"
          trend={{ isPositive: true, value: '12.5%', label: 'vs mes anterior' }}
        />
        <StatCard
          title="Máquinas en Red"
          value={`${onlineCount} / ${machines.length}`}
          subtitle={`${machines.length - onlineCount} en mantenimiento / offline`}
          icon={Cpu}
          color="blue"
        />
        <StatCard
          title="Consumo de Producto"
          value={`${finance.totalLiters.toFixed(1)} L`}
          subtitle="Volumen histórico acumulado"
          icon={Droplet}
          color="purple"
        />
        <StatCard
          title="Alertas Activas"
          value={activeAlertsCount}
          subtitle={activeAlertsCount > 0 ? 'Requiere atención operativa' : 'Sin incidencias graves'}
          icon={activeAlertsCount > 0 ? ShieldAlert : CheckCircle2}
          color={activeAlertsCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Secciones Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda / Central: Resumen de Máquinas (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Máquinas en Operación */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white text-base">Estado de Máquinas Vending</h3>
              </div>
              <Link to="/machines" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {machines.map((m) => {
                const status = m.machine_status;
                return (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-brand-400 font-bold">{m.device_id}</span>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{m.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        m.status === 'online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 line-clamp-1">{m.location_address}</div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Saldo en Máquina</span>
                        <span className="font-bold text-emerald-400">${Number(status?.stored_cash_balance || 0).toFixed(2)} MXN</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Saldo Disponible</span>
                        <span className="font-bold text-brand-300">${Number(status?.available_balance || 0).toFixed(2)} MXN</span>
                      </div>
                    </div>

                    <Link 
                      to={`/machines/${m.id}`}
                      className="block w-full py-2 text-center rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                    >
                      Inspeccionar Tanques (8/8)
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfica de Distribución Financiera por Método de Pago */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Ingresos por Método de Pago</h3>
              </div>
              <span className="text-xs text-slate-400">Total acumulado</span>
            </div>

            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`$${Number(val).toFixed(2)} MXN`, 'Ingreso']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Alertas Recientes e Incidencias (1/3) */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Alertas Recientes</h3>
              </div>
              <Link to="/alerts" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay alertas registradas.</p>
              ) : (
                alerts.slice(0, 4).map((a) => (
                  <div 
                    key={a.id} 
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      a.is_resolved 
                        ? 'bg-slate-950/40 border-slate-800 text-slate-400' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="uppercase text-[10px] tracking-wide font-mono">{a.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                        a.is_resolved ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {a.is_resolved ? 'Resuelta' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="font-medium text-slate-200">{a.value_string || a.alert_type}</p>
                    <p className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleString('es-MX')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
