import React, { useEffect, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { isoToLocalInput, localToISO } from '../../services/_filters';

export const FilterBar = ({ children, onReset, activeCount = 0 }) => (
  <div className="card p-3 flex flex-col lg:flex-row lg:items-center gap-3">
    <div className="flex items-center gap-2 text-xs font-semibold text-content-muted px-1 flex-shrink-0">
      <Filter className="w-4 h-4 text-accent-soft" />
      <span>Filtros</span>
      {activeCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-soft text-[10px] font-bold">
          {activeCount}
        </span>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-2 flex-1">{children}</div>

    {activeCount > 0 && onReset && (
      <button onClick={onReset} className="btn-ghost flex-shrink-0" type="button">
        <X className="w-3.5 h-3.5" /> Limpiar
      </button>
    )}
  </div>
);

export const SelectFilter = ({ label, value, onChange, options, allLabel = 'Todas', className = '' }) => (
  <label className={`flex items-center gap-2 ${className}`}>
    {label && <span className="sr-only">{label}</span>}
    <select
      aria-label={label}
      className="select min-w-[9rem]"
      value={value ?? 'all'}
      onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

/** Sólo ofrece las máquinas que el usuario tiene asignadas. */
export const MachineFilter = ({ machines, value, onChange }) => (
  <SelectFilter
    label="Máquina"
    value={value}
    onChange={onChange}
    allLabel={`Todas las máquinas (${machines.length})`}
    options={machines.map((m) => ({ value: m.id, label: m.name || m.device_id }))}
  />
);

export const ProductFilter = ({ products, value, onChange }) => (
  <SelectFilter
    label="Producto"
    value={value}
    onChange={onChange}
    allLabel="Todos los productos"
    options={products.map((p) => ({ value: p.id, label: p.name }))}
  />
);

const PRESETS = [
  { id: '7d', label: '7 días', days: 7 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '90d', label: '90 días', days: 90 },
];

/**
 * Rango con hora. <input type="datetime-local"> trabaja en hora LOCAL; la
 * conversión a ISO/UTC vive en _filters.js — sin ella los rangos horarios salen
 * desplazados respecto a lo que guarda Postgres.
 */
export const DateRangeFilter = ({ value, onChange }) => {
  const [custom, setCustom] = useState(false);

  const applyPreset = (days) => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    setCustom(false);
    onChange({ from: from.toISOString(), to: to.toISOString(), preset: `${days}d` });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => applyPreset(p.days)}
          className={`px-2.5 py-2 rounded-control text-xs font-semibold border transition-colors ${
            !custom && value?.preset === p.id
              ? 'bg-accent/20 text-accent-soft border-accent/40'
              : 'bg-surface-sunken text-content-muted border-line-subtle hover:text-content'
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setCustom((c) => !c)}
        className={`px-2.5 py-2 rounded-control text-xs font-semibold border transition-colors ${
          custom
            ? 'bg-accent/20 text-accent-soft border-accent/40'
            : 'bg-surface-sunken text-content-muted border-line-subtle hover:text-content'
        }`}
      >
        Personalizado
      </button>

      {custom && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="datetime-local"
            aria-label="Desde"
            className="input w-auto"
            value={isoToLocalInput(value?.from)}
            onChange={(e) => onChange({ ...value, from: localToISO(e.target.value), preset: 'custom' })}
          />
          <span className="text-xs text-content-muted">a</span>
          <input
            type="datetime-local"
            aria-label="Hasta"
            className="input w-auto"
            value={isoToLocalInput(value?.to)}
            onChange={(e) => onChange({ ...value, to: localToISO(e.target.value), preset: 'custom' })}
          />
        </div>
      )}
    </div>
  );
};

export const SearchInput = ({ value, onChange, placeholder = 'Buscar…', debounceMs = 250 }) => {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== (value || '')) onChange(text);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="relative flex-1 min-w-[12rem]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
      <input
        type="search"
        className="input pl-9"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
};
