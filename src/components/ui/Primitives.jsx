import React from 'react';
import { AlertTriangle, Inbox, RefreshCw, Cpu, Info } from 'lucide-react';

/** Botón de recarga manual. Los datos llegan por MQTT y no hay realtime. */
export const RefreshButton = ({ onClick, loading, label = 'Actualizar' }) => (
  <button onClick={onClick} disabled={loading} className="btn-secondary" title="Volver a consultar los datos">
    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    <span className="hidden sm:inline">{loading ? 'Actualizando…' : label}</span>
  </button>
);

/** Aviso informativo en línea. */
export const Notice = ({ tone = 'info', title, children }) => {
  const cls =
    tone === 'warn'
      ? 'bg-status-warn/10 border-status-warn/30 text-amber-200'
      : 'bg-status-info/10 border-status-info/30 text-sky-200';
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${cls}`}>
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────

const TONES = {
  neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  accent: 'bg-accent/15 text-accent-soft border-accent/30',
  ok: 'bg-status-ok/15 text-emerald-300 border-status-ok/30',
  warn: 'bg-status-warn/15 text-amber-300 border-status-warn/30',
  danger: 'bg-status-danger/15 text-rose-300 border-status-danger/30',
  info: 'bg-status-info/15 text-sky-300 border-status-info/30',
};

export const Badge = ({ tone = 'neutral', icon: Icon, children, className = '', title }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${TONES[tone] || TONES.neutral} ${className}`}
  >
    {Icon && <Icon className="w-3 h-3" />}
    {children}
  </span>
);

// ─── Estado de máquina ───────────────────────────────────────────────────────

const MACHINE_TONE = {
  online: 'ok',
  offline: 'danger',
  maintenance: 'warn',
  security_lock: 'danger',
};
const MACHINE_LABEL = {
  online: 'En línea',
  offline: 'Fuera de línea',
  maintenance: 'Mantenimiento',
  security_lock: 'Bloqueo',
};

export const StatusPill = ({ status }) => (
  <Badge tone={MACHINE_TONE[status] || 'neutral'}>{MACHINE_LABEL[status] || status || '—'}</Badge>
);

// ─── Identificación de máquina ───────────────────────────────────────────────

/** Chip compacto: en alertas y ventas hay que ver SIEMPRE de qué máquina se trata. */
export const MachineChip = ({ machine, deviceId, name, className = '' }) => {
  const label = machine?.name || name;
  const device = machine?.device_id || deviceId;
  if (!label && !device) return <span className="text-content-muted">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <Cpu className="w-3.5 h-3.5 text-accent-soft flex-shrink-0" />
      <span className="truncate text-xs font-semibold text-content-secondary">{label || device}</span>
      {device && label && (
        <span className="text-[10px] font-mono text-content-faint flex-shrink-0">{device}</span>
      )}
    </span>
  );
};

// ─── Estados de carga / vacío / error ────────────────────────────────────────

export const LoadingState = ({ label = 'Cargando…', rows = 0 }) => {
  if (rows > 0) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-surface-hover/60 animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs text-content-muted">
      <RefreshCw className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
};

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="p-3 rounded-2xl bg-surface-hover/60 border border-line-subtle mb-3">
      <Icon className="w-6 h-6 text-content-muted" />
    </div>
    <p className="text-sm font-bold text-content-secondary">{title}</p>
    {description && <p className="text-xs text-content-muted mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Ahora que los servicios lanzan en vez de caer al mock en silencio, hace falta
 * mostrar el fallo. Se incluyen `code` y `hint` de PostgREST: son lo que permite
 * distinguir "columna que no existe" de "RLS bloqueando la lectura".
 */
export const ErrorState = ({ error, onRetry, compact = false }) => {
  const code = error?.code;
  const hint = error?.hint;
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 ${compact ? 'py-6 px-4' : 'py-12 px-6'}`}
    >
      <div className="p-3 rounded-2xl bg-status-danger/10 border border-status-danger/30">
        <AlertTriangle className="w-6 h-6 text-status-danger" />
      </div>
      <div>
        <p className="text-sm font-bold text-rose-300">No se pudieron cargar los datos</p>
        <p className="text-xs text-content-muted mt-1 max-w-md break-words">
          {error?.message || 'Error desconocido'}
        </p>
        {(code || hint) && (
          <p className="text-[10px] font-mono text-content-faint mt-2">
            {code && `código ${code}`}
            {code && hint && ' · '}
            {hint}
          </p>
        )}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      )}
    </div>
  );
};
