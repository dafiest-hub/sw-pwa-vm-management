import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMachineById, updateMachineInfo } from '../services/machineService';
import { useAuth } from '../context/AuthContext';
import { TankLevelGauge } from '../components/common/TankLevelGauge';
import { SecurityBadge } from '../components/common/SecurityBadge';
import {
  ArrowLeft,
  MapPin,
  Activity,
  SlidersHorizontal,
  Pencil,
  Save,
  Wallet,
} from 'lucide-react';
import { getLastConfigAck } from '../services/alertService';
import { readPendingSync, publishTankConfig } from '../services/machineService';
import { TankSettingsEditor, SyncStatusBadge } from '../components/machines/TankSettingsEditor';
import { Modal } from '../components/ui/Modal';
import { StatusPill, LoadingState, EmptyState } from '../components/ui/Primitives';
import { useToast } from '../components/ui/Toast';
import { formatDateTime, formatMoney, formatRelative } from '../lib/format';
import { parseConfigAck } from '../lib/alerts';

export const MachineDetail = () => {
  const { id } = useParams();
  const { isTechnician, isAdmin } = useAuth();
  const toast = useToast();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edición de la ficha (nombre y ubicación)
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', location_address: '' });
  const [savingInfo, setSavingInfo] = useState(false);

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

  const openEdit = () => {
    setForm({
      name: machine.name || '',
      location_address: machine.location_address || '',
    });
    setShowEdit(true);
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const updated = await updateMachineInfo(machine.id, form);
      // Se refleja al momento en vez de esperar a la recarga completa.
      setMachine((prev) => ({ ...prev, ...updated }));
      setShowEdit(false);
      toast.success('Ficha de la máquina actualizada.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleRetrySync = async () => {
    const result = await publishTankConfig(machine.id, machine.device_id, machine.tanks);
    setSync(result);
    if (result.status === 'synced') toast.success('Configuración enviada a la máquina.');
    else toast.error(`Sigue sin poder enviarse: ${result.error}`);
  };

  if (loading) {
    return <LoadingState label="Cargando el estado de la máquina…" />;
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
          <div className="self-start sm:self-auto flex flex-col sm:items-end gap-3">
            {/* Dinero acumulado en el monedero: `stored_cash_balance`, lo que hay
                físicamente dentro esperando recolección. NO es el saldo de la
                sesión en curso (`available_balance`, el de la telemetría de
                seguridad de abajo): éste sube con cada moneda, no baja al
                concretarse la venta —el dinero ya está dentro— y sólo vuelve a 0
                con el corte de caja del menú de servicio S3.3. */}
            <div className="w-full sm:w-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-sunken border border-line-subtle">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                <Wallet className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-content-faint">
                  Dinero en monedero
                </p>
                {machine.machine_status ? (
                  <>
                    <p className="text-xl font-black text-emerald-300 leading-tight">
                      {formatMoney(machine.machine_status.stored_cash_balance)}
                    </p>
                    <p className="text-[10px] text-content-faint">
                      Pendiente de recolectar · {formatRelative(machine.machine_status.updated_at)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-content-muted mt-0.5">
                    La máquina aún no ha enviado telemetría
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Sólo administradores: renombrar o mover una máquina es un cambio de
                  catálogo, no una operación de campo. */}
              {isAdmin && (
                <button onClick={openEdit} className="btn-secondary">
                  <Pencil className="w-4 h-4 text-accent-soft" /> Editar ficha
                </button>
              )}
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

      {/* Ficha de la máquina. `device_id`, estado y versión los publica el equipo:
          aquí sólo se edita lo que es información de gestión. */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        icon={Pencil}
        title="Editar ficha de la máquina"
        subtitle={machine.device_id}
      >
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label htmlFor="machine-name" className="block text-xs font-semibold text-content-secondary mb-1">
              Nombre
            </label>
            <input
              id="machine-name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Expendedora Plaza Central"
              className="input w-full"
            />
          </div>

          <div>
            <label htmlFor="machine-location" className="block text-xs font-semibold text-content-secondary mb-1">
              Ubicación
            </label>
            <input
              id="machine-location"
              type="text"
              maxLength={250}
              value={form.location_address}
              onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))}
              placeholder="Ej. Av. Reforma 120, junto a recepción"
              className="input w-full"
            />
            <p className="text-[10px] text-content-faint mt-1">
              Sirve para localizarla en una visita; puede dejarse vacía.
            </p>
          </div>

          <p className="text-[11px] text-content-muted bg-surface-sunken border border-line-subtle rounded-xl px-3 py-2">
            El identificador <strong>{machine.device_id}</strong>, el estado y la versión los publica la
            propia máquina y no se editan desde aquí.
          </p>

          <div className="flex gap-2 pt-2 border-t border-line-subtle">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingInfo || !form.name.trim()}
              className="btn-primary flex-1"
            >
              <Save className="w-4 h-4" />
              {savingInfo ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

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
