import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Save, Wand2, WifiOff } from 'lucide-react';
import { saveMachineTankSettings, validateTankSettings } from '../../services/machineService';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Primitives';
import { Modal } from '../ui/Modal';
import { formatLiters, formatMoney, formatRelative, machineStatusLabel } from '../../lib/format';

const num = (v) => (v === '' || v === null || v === undefined ? '' : String(v));

/**
 * Edición conjunta de precio y nivel mínimo de los 8 tanques de una máquina.
 *
 * El firmware NO acepta actualización parcial: el downlink
 * {device_id}/config/prices lleva siempre los 8 tanques. Por eso la unidad de
 * edición es la máquina completa, aunque en la base cada valor viva en su
 * propia fila de machine_tanks.
 */
export const TankSettingsEditor = ({ machine, tanks, onSaved }) => {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkMin, setBulkMin] = useState('');
  const [confirmingOffline, setConfirmingOffline] = useState(false);

  // `machines.status` lo escribe el consumidor MQTT con la telemetría, así que
  // es un dato con retraso: no sirve para BLOQUEAR el guardado (los valores son
  // válidos y el downlink ya es best-effort), pero sí para avisar de que lo más
  // probable es que la configuración quede pendiente de sincronizar.
  const offline = machine?.status && machine.status !== 'online';

  useEffect(() => {
    setRows(
      (tanks || []).map((t) => ({
        id: t.id,
        tank_number: t.tank_number,
        product: t.product,
        capacity_liters: Number(t.capacity_liters),
        current_liters: Number(t.current_liters),
        price_per_liter: num(t.price_per_liter),
        low_threshold_liters: num(t.low_threshold_liters),
        _price0: num(t.price_per_liter),
        _min0: num(t.low_threshold_liters),
      }))
    );
  }, [tanks]);

  const patch = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const dirty = useMemo(
    () => rows.filter((r) => r.price_per_liter !== r._price0 || r.low_threshold_liters !== r._min0),
    [rows]
  );

  // Las reglas viven en machineService (validateTankRow) porque las comparte con
  // el guardado: duplicarlas aquí dejaría que el editor aceptara lo que el
  // guardado rechaza. Se bloquea antes de tocar la base de datos.
  const problems = useMemo(() => validateTankSettings(rows), [rows]);

  const applyToAll = (field, value) => {
    if (value === '') return;
    setRows((prev) => prev.map((r) => ({ ...r, [field]: value })));
  };

  const restoreCatalogPrices = () =>
    setRows((prev) =>
      prev.map((r) =>
        r.product?.default_price_per_liter != null
          ? { ...r, price_per_liter: num(r.product.default_price_per_liter) }
          : r
      )
    );

  const revert = () =>
    setRows((prev) => prev.map((r) => ({ ...r, price_per_liter: r._price0, low_threshold_liters: r._min0 })));

  const requestSave = () => {
    if (problems.length) return;
    if (offline) {
      setConfirmingOffline(true);
      return;
    }
    save();
  };

  const save = async () => {
    if (problems.length) return;
    setConfirmingOffline(false);
    setSaving(true);
    try {
      const result = await saveMachineTankSettings(machine.id, rows, { deviceId: machine.device_id });
      setRows((prev) =>
        prev.map((r) => ({ ...r, _price0: r.price_per_liter, _min0: r.low_threshold_liters }))
      );

      if (result.sync.status === 'synced') {
        toast.success('Configuración guardada y enviada a la máquina. Se reiniciará en unos segundos.');
      } else if (result.sync.status === 'demo') {
        toast.info('Configuración guardada en los datos de demostración.');
      } else {
        toast.info(
          'Configuración guardada. Queda pendiente de enviar a la máquina: el canal de comunicación con el equipo no está disponible ahora mismo.'
        );
      }
      onSaved?.(result);
    } catch (e) {
      toast.error(`No se pudo guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 p-3 rounded-2xl bg-surface-sunken border border-line-subtle">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-content-muted">
          <Wand2 className="w-4 h-4 text-accent-soft" /> Aplicar a todos
        </div>
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-content-muted">Precio/L</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="999999.99"
            className="input w-24"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            onBlur={() => applyToAll('price_per_liter', bulkPrice)}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-content-muted">Mínimo L</span>
          <input
            type="number"
            step="0.001"
            min="0.001"
            max="999999.999"
            className="input w-24"
            value={bulkMin}
            onChange={(e) => setBulkMin(e.target.value)}
            onBlur={() => applyToAll('low_threshold_liters', bulkMin)}
          />
        </label>
        <button type="button" onClick={restoreCatalogPrices} className="btn-secondary">
          Precio de catálogo
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line-subtle">
        <table className="w-full min-w-[600px] border-collapse">
          <thead className="bg-surface-sunken/60 border-b border-line-subtle">
            <tr>
              <th className="th">Tanque</th>
              <th className="th">Producto</th>
              <th className="th text-right">Nivel actual</th>
              <th className="th text-right">Precio por litro</th>
              <th className="th text-right">Nivel mínimo (L)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows.map((r) => {
              const changed = r.price_per_liter !== r._price0 || r.low_threshold_liters !== r._min0;
              const willBeLow = Number(r.current_liters) < Number(r.low_threshold_liters);
              return (
                <tr key={r.id} className={changed ? 'bg-accent/5' : ''}>
                  <td className="td font-mono text-accent-soft font-bold">T{r.tank_number}</td>
                  <td className="td">
                    <p className="text-content-secondary truncate">{r.product?.name || 'Sin producto'}</p>
                    <p className="text-[10px] text-content-faint font-mono">{r.product?.sku}</p>
                  </td>
                  <td className="td text-right text-content-muted whitespace-nowrap">
                    {formatLiters(r.current_liters, 1)}
                    <span className="text-[10px] text-content-faint"> / {r.capacity_liters} L</span>
                  </td>
                  <td className="td text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999.99"
                      aria-label={`Precio del tanque ${r.tank_number}`}
                      className="input w-24 text-right"
                      value={r.price_per_liter}
                      onChange={(e) => patch(r.id, 'price_per_liter', e.target.value)}
                    />
                  </td>
                  <td className="td text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={r.capacity_liters}
                      aria-label={`Nivel mínimo del tanque ${r.tank_number}`}
                      className="input w-24 text-right"
                      value={r.low_threshold_liters}
                      onChange={(e) => patch(r.id, 'low_threshold_liters', e.target.value)}
                    />
                    {willBeLow && (
                      <p className="text-[10px] text-amber-300 mt-1">quedará bajo mínimo</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {problems.length > 0 && (
        <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 space-y-1">
          {problems.map((p) => (
            <p key={p} className="text-xs text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {p}
            </p>
          ))}
        </div>
      )}

      <p className="text-[11px] text-content-muted bg-surface-sunken border border-line-subtle rounded-xl px-3 py-2">
        Al guardar se envían <strong>los 8 tanques a la vez</strong>: la máquina no admite
        actualizaciones parciales. Guarda la configuración y{' '}
        <strong>se reinicia unos 5 segundos después</strong>, por lo que quedará fuera de línea un
        momento. El precio y el nivel mínimo deben ser <strong>mayores que 0</strong> —la máquina
        no admite 0 y quedaría pendiente de sincronizar de forma permanente— con{' '}
        <strong>2 decimales como máximo en el precio y 3 en el nivel</strong>, que es lo que
        guardan la base y el equipo.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-content-muted">
          {dirty.length ? `${dirty.length} tanque${dirty.length > 1 ? 's' : ''} con cambios sin guardar` : 'Sin cambios'}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={revert} disabled={!dirty.length} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> Descartar
          </button>
          <button
            type="button"
            onClick={requestSave}
            disabled={saving || !dirty.length || problems.length > 0}
            className="btn-primary"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando…' : 'Guardar y enviar'}
          </button>
        </div>
      </div>

      <Modal
        open={confirmingOffline}
        onClose={() => setConfirmingOffline(false)}
        size="sm"
        icon={WifiOff}
        title="La máquina no está en línea"
        subtitle={`${machine?.name || ''} · ${machineStatusLabel(machine?.status)}`}
        footer={
          <>
            <button type="button" onClick={() => setConfirmingOffline(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="button" onClick={save} className="btn-primary flex-1">
              Guardar de todas formas
            </button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-content-secondary">
          <p>
            El último estado recibido de la máquina es{' '}
            <strong>{machineStatusLabel(machine?.status)}</strong>
            {machine?.machine_status?.updated_at
              ? ` (telemetría de ${formatRelative(machine.machine_status.updated_at)})`
              : ''}
            .
          </p>
          <p>
            Los precios y niveles mínimos <strong>sí quedarán guardados</strong>, pero es probable
            que no se puedan enviar al equipo ahora mismo: en ese caso la máquina quedará
            <strong> pendiente de sincronizar</strong> y seguirá cobrando los precios anteriores
            hasta que se reintente el envío.
          </p>
          <p className="text-content-muted">
            El estado lo publica la propia máquina con su telemetría, así que puede estar
            desactualizado: si sabes que está encendida, puedes continuar.
          </p>
        </div>
      </Modal>
    </div>
  );
};

/** Estado de sincronización de la configuración con el equipo. */
export const SyncStatusBadge = ({ sync, onRetry }) => {
  if (!sync) return null;
  if (sync.status === 'synced')
    return <Badge tone="ok">Configuración sincronizada</Badge>;
  if (sync.status === 'demo') return <Badge tone="neutral">Modo demostración</Badge>;
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone="warn" icon={AlertTriangle} title={sync.error}>
        Pendiente de sincronizar
      </Badge>
      {onRetry && (
        <button onClick={onRetry} className="text-[10px] font-bold text-accent-soft hover:underline">
          Reintentar envío
        </button>
      )}
    </span>
  );
};

export default TankSettingsEditor;
