import React, { useEffect, useState } from 'react';
import { getTankOperations, getMoneyCollections } from '../services/operationService';
import { Wrench, RefreshCw, Trash2, DollarSign, Calendar } from 'lucide-react';

export const Operations = () => {
  const [operations, setOperations] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tanks');

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    setLoading(true);
    try {
      const [opData, mcData] = await Promise.all([
        getTankOperations(),
        getMoneyCollections()
      ]);
      setOperations(opData);
      setCollections(mcData);
    } catch (err) {
      console.error('Error al cargar operaciones técnicas:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Operaciones & Mantenimiento Técnico</h2>
        <p className="text-xs text-slate-400 mt-0.5">Auditoría de recargas de líquido, purgas de tanques y retiros de efectivo</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tanks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tanks' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Recargas y Purgas ({operations.length})
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'collections' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Retiros de Efectivo / Cortes de Caja ({collections.length})
        </button>
      </div>

      {/* Operaciones Tanque */}
      {activeTab === 'tanks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Fecha / Hora</th>
                  <th className="p-4">Tipo Operación</th>
                  <th className="p-4">Máquina</th>
                  <th className="p-4">Tanque & Producto</th>
                  <th className="p-4">Nivel Previo → Posterior</th>
                  <th className="p-4">Neto Litros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">Cargando historial técnico...</td></tr>
                ) : operations.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay operaciones registradas.</td></tr>
                ) : (
                  operations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {new Date(op.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          op.operation_type === 'refill' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {op.operation_type === 'refill' ? <RefreshCw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                          {op.operation_type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">
                        {op.machine?.name || 'Expendedora Central'}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-brand-300">T#{op.tank_number}: </span>
                        <span className="text-slate-200">{op.product?.name || 'Producto'}</span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono">
                        {Number(op.tank_liters_before).toFixed(2)} L → {Number(op.tank_liters_after).toFixed(2)} L
                      </td>
                      <td className={`p-4 font-bold ${Number(op.net_liters || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Number(op.net_liters || (op.tank_liters_after - op.tank_liters_before)).toFixed(2)} L
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retiros de Efectivo */}
      {activeTab === 'collections' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Máquina</th>
                  <th className="p-4">Monto Recolectado</th>
                  <th className="p-4">Tipo Moneda</th>
                  <th className="p-4">Notas / Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando recolecciones...</td></tr>
                ) : collections.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay cortes de caja registrados.</td></tr>
                ) : (
                  collections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {new Date(col.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {col.machine?.name || 'Expendedora Central'}
                      </td>
                      <td className="p-4 font-extrabold text-emerald-400 text-sm">
                        ${Number(col.amount_collected).toFixed(2)} MXN
                      </td>
                      <td className="p-4 text-slate-300 capitalize">{col.payment_type}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">{col.notes || '-'}</td>
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
