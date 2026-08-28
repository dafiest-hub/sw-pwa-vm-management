import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Tarjeta de indicador. `tone` es semántico (antes era `color`, con nombres de
 * paleta como "blue" o "purple" que ataban la tarjeta a un color concreto).
 */
const TONES = {
  accent: {
    box: 'from-accent/10 to-accent/5 border-accent/20',
    icon: 'text-accent-soft',
  },
  ok: {
    box: 'from-status-ok/10 to-status-ok/5 border-status-ok/20',
    icon: 'text-emerald-400',
  },
  warn: {
    box: 'from-status-warn/10 to-status-warn/5 border-status-warn/20',
    icon: 'text-amber-400',
  },
  danger: {
    box: 'from-status-danger/10 to-status-danger/5 border-status-danger/20',
    icon: 'text-rose-400',
  },
  neutral: {
    box: 'from-slate-500/10 to-slate-500/5 border-slate-500/20',
    icon: 'text-slate-400',
  },
};

export const StatCard = ({ title, value, subtitle, icon: Icon, trend, tone = 'accent', to }) => {
  const t = TONES[tone] || TONES.accent;

  const body = (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br border glass-panel-hover relative overflow-hidden h-full ${t.box}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-semibold text-content-muted">{title}</p>
          <p className="text-2xl font-extrabold text-content mt-1 truncate">{value}</p>
          {subtitle && <p className="text-[11px] text-content-muted mt-0.5">{subtitle}</p>}
          {trend && (
            <p
              className={`text-[11px] font-semibold mt-1 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}{' '}
              <span className="text-content-muted font-normal">{trend.label}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-surface-raised/60 border border-line-subtle shadow-inner flex-shrink-0">
            <Icon className={`w-6 h-6 ${t.icon}`} />
          </div>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
};

export default StatCard;
