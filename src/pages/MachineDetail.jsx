import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMachineById } from '../services/machineService';
import { useAuth } from '../context/AuthContext';
import { TankLevelGauge } from '../components/common/TankLevelGauge';
import { SecurityBadge } from '../components/common/SecurityBadge';
import {
  ArrowLeft,
  MapPin,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { getLastConfigAck } from '../services/alertService';
import { readPendingSync, publishTankConfig } from '../services/machineService';
import { TankSettingsEditor, SyncStatusBadge } from '../components/machines/TankSettingsEditor';
import { Modal } from '../components/ui/Modal';
import { StatusPill, LoadingState, EmptyState } from '../components/ui/Primitives';
import { useToast } from '../components/ui/Toast';
import { formatDateTime } from '../lib/format';
import { parseConfigAck } from '../lib/alerts';

export const MachineDetail = () => {
  const { id } = useParams();
  const { isTechnician } = useAuth();
  const toast = useToast();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configuración conjunta de los 8 tanques
  const [showSettings, setShowSettings] = useState(false);
  const [sync, setSync] = useState(null);
  const [lastAck, setLastAck] = useState(null);

  useEffect(() => {
    loadMachineData();
  }, [id]);

  const loadMachineData = async () => {
    setLoading(true);
    try {
      const data = await getMachineById(id);
      setMachine(data);

      // No hay columna en la base que refleje "config pendiente": el aviso se
      // conserva localmente y se contrasta con el último ACK real del equipo.
      const pending = readPendingSync(id);
      setSync(pending ? { status: 'pending', ...pending } : null);
      setLastAck(await getLastConfigAck(id).catch(() => null));
    } catch (err) {
      console.error('Error al cargar detalle de máquina:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySync = async () => {
    const result = await publishTankConfig(machine.id, machine.device_id, machine.tanks);
    setSync(result);
    if (result.status === 'synced') toast.success('Configuración enviada a la máquina.');
    else toast.error(`Sigue sin poder enviarse: ${result.error}`);
  };

  if (loading) {
    return <LoadingState label="Cargando telemetría de la máquina…" />;
  }

  if (!machine) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-slate-400 text-xs">Máquina no encontrada.</p>
        <Link to="/machines" className="text-brand-400 hover:underline text-xs">Volver a máquinas</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver & Header */}
      <div>
        <Link to="/machines" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo de máquinas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {machine.device_id}
              </span>
              <StatusPill status={machine.status} />
              <SyncStatusBadge sync={sync} onRetry={handleRetrySync} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">{machine.name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{machine.location_address}</span>
            </div>
          </div>
          <div className="self-start sm:self-auto flex flex-wrap gap-2">
            {isTechnician && (
              <button onClick={() => setShowSettings(true)} className="btn-primary">
                <SlidersHorizontal className="w-4 h-4" /> Precios y niveles mínimos
              </button>
            )}
            <button onClick={loadMachineData} className="btn-secondary">
              <Activity className="w-4 h-4 text-accent-soft" /> Refrescar
            </button>
          </div>
        </div>
      </div>

      {/* Widget de Seguridad y Sensores de Impacto/Puerta */}
      <SecurityBadge status={machine.machine_status} />

      {/* Título Tanques */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-lg font-bold text-white">Medidores de Tanques de Líquidos (8/8)</h3>
          <p className="text-xs text-slate-400">Niveles de insumos, capacidad, pulsos de bombas y precios por litro</p>
        </div>
      </div>

      {/* Grid de los 8 Tanques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {machine.tanks && machine.tanks.length > 0 ? (
          machine.tanks.map((tank) => (
            <TankLevelGauge
              key={tank.id || tank.tank_number}
              tank={tank}
            />
          ))
        ) : (
          <p className="col-span-full text-center py-6 text-slate-400 text-xs">No hay tanques configurados para esta máquina.</p>
        )}
      </div>

      {/* Configuración conjunta de los 8 tanques */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        size="xl"
        icon={SlidersHorizontal}
        title="Precios y niveles mínimos"
        subtitle={`${machine.name} · ${machine.device_id}`}
      >
        {lastAck && (
          <p className="text-[11px] text-content-muted mb-4">
            Última confirmación recibida de la máquina: {formatDateTime(lastAck.created_at)}
            {parseConfigAck(lastAck).status && ` · ${parseConfigAck(lastAck).status}`}
          </p>
        )}
        {machine.tanks?.length ? (
          <TankSettingsEditor
            machine={machine}
            tanks={machine.tanks}
            onSaved={(result) => {
              setSync(result.sync);
              loadMachineData();
            }}
          />
        ) : (
          <EmptyState
            title="Esta máquina no tiene tanques dados de alta"
            description="Hay que crear las 8 filas de machine_tanks antes de poder configurar precios."
          />
        )}
      </Modal>
    </div>
  );
};
