import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellOff, Check, CheckCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { getAlerts, resolveAlert, reopenAlert, resolveAlerts } from '../services/alertService';
import { getProfileDirectory } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { useToast } from '../components/ui/Toast';
import { Badge, EmptyState, ErrorState, LoadingState, MachineChip, RefreshButton } from '../components/ui/Primitives';
import { DateRangeFilter, FilterBar, MachineFilter, SelectFilter } from '../components/ui/Filters';
import {
  ALERT_CATEGORY_META,
  ALERT_TYPE_META,
  alertCategoryMeta,
  alertDetailLine,
  alertMessage,
  alertTypeMeta,
} from '../lib/alerts';
import { defaultRange } from '../services/_filters';
import { formatDateTime, formatRelative } from '../lib/format';

const initialRange = () => ({ ...defaultRange(90), preset: '90d' });

// Clases completas y estáticas: Tailwind sólo genera las que puede leer
// literalmente en el código, así que no valen los nombres compuestos.
const ICON_TONE = {
  danger: 'bg-status-danger/15 text-rose-300 border-status-danger/25',
  warn: 'bg-status-warn/15 text-amber-300 border-status-warn/25',
  ok: 'bg-status-ok/15 text-emerald-300 border-status-ok/25',
  neutral: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  resolved: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const Alerts = () => {
  const { isTechnician, user } = useAuth();
  const { machines, scopeFor, loading: loadingMachines } = useScopedMachines();
  const toast = useToast();

  const [alerts, setAlerts] = useState([]);
  const [directory, setDirectory] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const [machineId, setMachineId] = useState(null);
  const [category, setCategory] = useState(null);
  const [alertType, setAlertType] = useState(null);
  const [resolved, setResolved] = useState('pending');
  const [range, setRange] = useState(initialRange);

  const filters = useMemo(
    () => ({
      machineIds: scopeFor(machineId),
      category,
      alertType,
      resolved,
      from: range.from,
      to: range.to,
    }),
    [scopeFor, machineId, category, alertType, resolved, range.from, range.to]
  );

  const load = useCallback(async () => {
    if (loadingMachines) return;
    setLoading(true);
    setError(null);
    try {
      setAlerts(await getAlerts(filters));
      setSelected(new Set());
    } catch (e) {
      setError(e);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, loadingMachines]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getProfileDirectory()
      .then(setDirectory)
      .catch(() => setDirectory(new Map()));
  }, []);

  const resolverName = (id) => directory.get(id)?.full_name || directory.get(id)?.email || null;

  const handleResolve = async (alert) => {
    setBusy(alert.id);
    try {
      await resolveAlert(alert.id, { resolvedBy: user?.id });
      // Actualización optimista: recargar la lista entera por cada alerta es
      // inviable cuando llegan en ráfaga.
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id || null }
            : a
        )
      );
      toast.success('Alerta marcada como resuelta.');
    } catch (e) {
      toast.error(`No se pudo resolver la alerta: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleReopen = async (alert) => {
    setBusy(alert.id);
    try {
      await reopenAlert(alert.id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_resolved: false, resolved_at: null, resolved_by: null } : a))
      );
      toast.info('Alerta reabierta.');
    } catch (e) {
      toast.error(`No se pudo reabrir la alerta: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleBulkResolve = async () => {
    const ids = [...selected];
    setBusy('bulk');
    try {
      const { ok, failed } = await resolveAlerts(ids, { resolvedBy: user?.id });
      if (ok) toast.success(`${ok} alerta${ok > 1 ? 's' : ''} resuelta${ok > 1 ? 's' : ''}.`);
      if (failed) toast.error(`${failed} no se pudieron resolver.`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pendingCount = alerts.filter((a) => !a.is_resolved).length;
  const activeCount =
    (machineId ? 1 : 0) + (category ? 1 : 0) + (alertType ? 1 : 0) + (resolved !== 'pending' ? 1 : 0);

  const resetFilters = () => {
    setMachineId(null);
    setCategory(null);
    setAlertType(null);
    setResolved('pending');
    setRange(initialRange());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-content tracking-tight">Alertas e incidencias</h2>
          <p className="text-xs text-content-muted mt-0.5">
            Seguridad, bombas, nivel de tanque y fallos de dispensado, por máquina
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={load} loading={loading} />
        </div>
        {isTechnician && selected.size > 0 && (
          <button onClick={handleBulkResolve} disabled={busy === 'bulk'} className="btn-success">
            <CheckCheck className="w-4 h-4" />
            Resolver {selected.size} seleccionada{selected.size > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <FilterBar activeCount={activeCount} onReset={resetFilters}>
        <MachineFilter machines={machines} value={machineId} onChange={setMachineId} />
        <SelectFilter
          label="Categoría"
          value={category}
          onChange={setCategory}
          allLabel="Todas las categorías"
          options={Object.entries(ALERT_CATEGORY_META).map(([value, m]) => ({ value, label: m.label }))}
        />
        <SelectFilter
          label="Tipo"
          value={alertType}
          onChange={setAlertType}
          allLabel="Todos los tipos"
          options={Object.entries(ALERT_TYPE_META)
            .filter(([v]) => v !== 'config_ack')
            .map(([value, m]) => ({ value, label: m.label }))}
        />
        <SelectFilter
          label="Estado"
          value={resolved}
          onChange={(v) => setResolved(v || 'all')}
          allLabel="Todas"
          options={[
            { value: 'pending', label: 'Sólo pendientes' },
            { value: 'resolved', label: 'Sólo resueltas' },
          ]}
        />
        <DateRangeFilter value={range} onChange={setRange} />
      </FilterBar>

      {loading || loadingMachines ? (
        <LoadingState label="Cargando alertas…" />
      ) : error ? (
        <div className="card">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : !alerts.length ? (
        <div className="card">
          <EmptyState
            icon={resolved === 'pending' ? ShieldCheck : BellOff}
            title={resolved === 'pending' ? 'Sin incidencias pendientes' : 'Sin alertas'}
            description="No hay alertas que coincidan con los filtros seleccionados."
          />
        </div>
      ) : (
        <>
          <p className="text-xs text-content-muted">
            {alerts.length} alerta{alerts.length !== 1 && 's'}
            {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
          </p>

          <div className="space-y-3">
            {alerts.map((a) => {
              const cat = alertCategoryMeta(a.category);
              const type = alertTypeMeta(a.alert_type);
              const Icon = type.icon;
              const detail = alertDetailLine(a);
              const author = a.resolved_by ? resolverName(a.resolved_by) : null;

              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    a.is_resolved
                      ? 'bg-surface-raised/60 border-line-subtle'
                      : 'bg-surface-raised border-status-warn/30'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {isTechnician && !a.is_resolved && (
                      <input
                        type="checkbox"
                        aria-label="Seleccionar alerta"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="mt-3 w-4 h-4 accent-teal-600 flex-shrink-0"
                      />
                    )}
                    <div
                      className={`p-3 rounded-xl border flex-shrink-0 ${
                        a.is_resolved ? ICON_TONE.resolved : ICON_TONE[type.tone] || ICON_TONE.neutral
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={a.is_resolved ? 'neutral' : cat.tone}>{cat.label}</Badge>
                        <Badge tone="neutral">{type.label}</Badge>
                        <MachineChip machine={a.machine} />
                      </div>

                      <p
                        className={`text-xs font-semibold ${a.is_resolved ? 'text-content-muted' : 'text-content-secondary'}`}
                      >
                        {alertMessage(a)}
                      </p>

                      {detail && <p className="text-[10px] font-mono text-content-faint">{detail}</p>}

                      <p className="text-[10px] text-content-muted">
                        Registrada: {formatDateTime(a.created_at)} · {formatRelative(a.created_at)}
                        {a.is_resolved && a.resolved_at && (
                          <> · Resuelta {formatDateTime(a.resolved_at)}{author && ` por ${author}`}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {isTechnician && (
                    <div className="self-end sm:self-center flex-shrink-0">
                      {a.is_resolved ? (
                        <button
                          onClick={() => handleReopen(a)}
                          disabled={busy === a.id}
                          className="btn-secondary"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolve(a)}
                          disabled={busy === a.id}
                          className="btn-success"
                        >
                          <Check className="w-4 h-4" />
                          {busy === a.id ? 'Guardando…' : 'Marcar como resuelta'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
