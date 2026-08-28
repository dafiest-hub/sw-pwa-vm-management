import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getTankOperations, getMoneyCollections } from '../services/operationService';
import { getProfileDirectory } from '../services/profileService';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { defaultRange } from '../services/_filters';
import { DateRangeFilter, FilterBar, MachineFilter, SelectFilter } from '../components/ui/Filters';
import { ErrorState, LoadingState, RefreshButton } from '../components/ui/Primitives';
import { Wrench, RefreshCw, Trash2, DollarSign } from 'lucide-react';

const initialRange = () => ({ ...defaultRange(90), preset: '90d' });

export const Operations = () => {
  const { machines, scopeFor, loading: loadingMachines } = useScopedMachines();

  const [operations, setOperations] = useState([]);
  const [collections, setCollections] = useState([]);
  const [directory, setDirectory] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tanks');

  const [machineId, setMachineId] = useState(null);
  const [operationType, setOperationType] = useState(null);
  const [range, setRange] = useState(initialRange);

  // Antes esta página traía el histórico completo sin respetar
  // assigned_machine_ids: un técnico veía operaciones de máquinas ajenas.
  const filters = useMemo(
    () => ({
      machineIds: scopeFor(machineId),
      operationType,
      from: range.from,
      to: range.to,
    }),
    [scopeFor, machineId, operationType, range.from, range.to]
  );

  const loadOperationsData = useCallback(async () => {
    if (loadingMachines) return;
    setLoading(true);
    setError(null);
    try {
      const [opData, mcData] = await Promise.all([
        getTankOperations(filters),
        getMoneyCollections({ ...filters, operationType: undefined }),
      ]);
      setOperations(opData);
      setCollections(mcData);
    } catch (err) {
      setError(err);
      setOperations([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [filters, loadingMachines]);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData]);

  useEffect(() => {
    getProfileDirectory()
      .then(setDirectory)
      .catch(() => setDirectory(new Map()));
  }, []);

  const personName = (id) =>
    (id && (directory.get(id)?.full_name || directory.get(id)?.email)) || '—';

  const activeCount = (machineId ? 1 : 0) + (operationType ? 1 : 0) + (range.preset !== '90d' ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Operaciones & Mantenimiento Técnico</h2>
        <p className="text-xs text-slate-400 mt-0.5">Auditoría de recargas de líquido, purgas de tanques y retiros de efectivo</p>
        <div className="mt-3">
          <RefreshButton onClick={loadOperationsData} loading={loading} />
        </div>
      </div>

      <FilterBar
        activeCount={activeCount}
        onReset={() => {
          setMachineId(null);
          setOperationType(null);
          setRange(initialRange());
        }}
      >
        <MachineFilter machines={machines} value={machineId} onChange={setMachineId} />
        {activeTab === 'tanks' && (
          <SelectFilter
            label="Tipo de operación"
            value={operationType}
            onChange={setOperationType}
            allLabel="Recargas y purgas"
            options={[
              { value: 'refill', label: 'Sólo recargas' },
              { value: 'purge', label: 'Sólo purgas' },
            ]}
          />
        )}
        <DateRangeFilter value={range} onChange={setRange} />
      </FilterBar>

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
                  <th className="p-4">Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading || loadingMachines ? (
                  <tr><td colSpan="7"><LoadingState label="Cargando historial técnico…" /></td></tr>
                ) : error ? (
                  <tr><td colSpan="7"><ErrorState error={error} onRetry={loadOperationsData} compact /></td></tr>
                ) : operations.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay operaciones registradas.</td></tr>
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
                        {op.machine?.name || '—'}
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
                      <td className="p-4 text-slate-300">{personName(op.technician_user_id)}</td>
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
                  <th className="p-4">Responsable</th>
                  <th className="p-4">Notas / Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading || loadingMachines ? (
                  <tr><td colSpan="6"><LoadingState label="Cargando cortes de caja…" /></td></tr>
                ) : error ? (
                  <tr><td colSpan="6"><ErrorState error={error} onRetry={loadOperationsData} compact /></td></tr>
                ) : collections.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay cortes de caja registrados.</td></tr>
                ) : (
                  collections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap">
                        {new Date(col.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {col.machine?.name || '—'}
                      </td>
                      <td className="p-4 font-extrabold text-emerald-400 text-sm">
                        ${Number(col.amount_collected).toFixed(2)} MXN
                      </td>
                      <td className="p-4 text-slate-300 capitalize">{col.payment_type}</td>
                      <td className="p-4 text-slate-300">{personName(col.collector_user_id)}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">{col.notes || '—'}</td>
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
