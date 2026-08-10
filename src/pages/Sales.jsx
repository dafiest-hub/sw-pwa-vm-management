import React, { useEffect, useState } from 'react';
import { getSalesHistory, getSaleIncomes } from '../services/salesService';
import { DollarSign, CreditCard, Coins, CheckCircle, Search, Calendar, Gauge } from 'lucide-react';

export const Sales = () => {
  const [sales, setSales] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const [salesData, incomesData] = await Promise.all([
        getSalesHistory(),
        getSaleIncomes()
      ]);
      setSales(salesData);
      setIncomes(incomesData);
    } catch (err) {
      console.error('Error al cargar historial de ventas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (type) => {
    switch (type) {
      case 'monedas': return <Coins className="w-4 h-4 text-brand-400" />;
      case 'efectivo': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'tarjeta': return <CreditCard className="w-4 h-4 text-purple-400" />;
      default: return <DollarSign className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Ventas e Ingresos</h2>
        <p className="text-xs text-slate-400 mt-0.5">Auditoría transaccional de dispensado y registro de dinero ingresado</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sales' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Ventas y Dispensado ({sales.length})
        </button>
        <button
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incomes' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Ingresos por Medio de Pago ({incomes.length})
        </button>
      </div>

      {/* Tabla Ventas */}
      {activeTab === 'sales' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Máquina</th>
                  <th className="p-4">Tanque & Producto</th>
                  <th className="p-4">Monto Pagado</th>
                  <th className="p-4">Litros Solicitados</th>
                  <th className="p-4">Litros Medidor Flujo</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando ventas...</td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay registro de ventas.</td></tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {sale.machine_name || sale.machine?.name || 'Máquina'}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-brand-300">T#{sale.tank_number}: </span>
                        <span className="text-slate-200">{sale.product?.name || 'Producto'}</span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">
                        ${Number(sale.price_paid).toFixed(2)} MXN
                      </td>
                      <td className="p-4 text-slate-300">{Number(sale.liters_purchased).toFixed(3)} L</td>
                      <td className="p-4 font-mono text-cyan-300 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-slate-500" />
                        {Number(sale.liters_flow_sensor).toFixed(4)} L
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          sale.status === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          <CheckCircle className="w-3 h-3" />
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla Ingresos */}
      {activeTab === 'incomes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Máquina</th>
                  <th className="p-4">Medio de Pago</th>
                  <th className="p-4">Monto Ingresado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">Cargando ingresos...</td></tr>
                ) : incomes.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay registros de ingresos.</td></tr>
                ) : (
                  incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {new Date(inc.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {inc.machine?.name || 'Máquina Central'}
                      </td>
                      <td className="p-4 flex items-center gap-2 font-semibold capitalize text-slate-200">
                        {getPaymentIcon(inc.payment_type)}
                        {inc.payment_type}
                      </td>
                      <td className="p-4 font-extrabold text-emerald-400 text-sm">
                        +${Number(inc.amount).toFixed(2)} MXN
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
