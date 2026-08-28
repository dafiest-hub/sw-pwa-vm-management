import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, LogOut, Mail, ShieldCheck, Sparkles, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useScopedMachines } from '../hooks/useScopedMachines';
import { Badge, StatusPill } from '../components/ui/Primitives';
import { IS_DEMO } from '../lib/dataAccess';
import { formatDate, roleLabel } from '../lib/format';

const ROLE_TONE = { admin: 'accent', technician: 'warn', viewer: 'neutral' };

const ROLE_DESCRIPTION = {
  admin: 'Acceso completo: gestión de usuarios, catálogo, precios y alta de máquinas.',
  technician: 'Operación en campo: recargas, resolución de alertas y ajuste de precios.',
  viewer: 'Sólo consulta: puede ver los datos, pero no modificarlos.',
};

export const Profile = () => {
  const { user, profile, role, isAdmin, logout, isDemo } = useAuth();
  const { machines, loading } = useScopedMachines();

  const name = profile?.full_name || 'Usuario';
  const email = profile?.email || user?.email || '—';
  const assigned = profile?.assigned_machine_ids;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-content tracking-tight">Mi perfil</h2>
        <p className="text-xs text-content-muted mt-0.5">Datos de la cuenta y alcance de acceso</p>
      </div>

      {/* Identidad */}
      <section className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-accent/40"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-surface-hover border border-line-subtle flex items-center justify-center text-2xl font-black text-content-secondary">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 space-y-2">
          <h3 className="text-xl font-black text-content truncate">{name}</h3>
          <p className="text-xs text-content-muted flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {email}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ROLE_TONE[role] || 'neutral'} icon={ShieldCheck}>
              {roleLabel(role)}
            </Badge>
            {isDemo && (
              <Badge tone="warn" icon={Sparkles}>
                Sesión de demostración
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Permisos */}
        <section className="card p-5 space-y-3">
          <h4 className="text-sm font-bold text-content flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent-soft" /> Permisos
          </h4>
          <p className="text-xs text-content-secondary">{ROLE_DESCRIPTION[role] || '—'}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-line-subtle">
            <dt className="text-content-muted">Identificador</dt>
            <dd className="font-mono text-[10px] text-content-secondary break-all">
              {profile?.id || user?.id || '—'}
            </dd>
            <dt className="text-content-muted">Autenticación</dt>
            <dd className="text-content-secondary">
              {IS_DEMO ? 'Modo demostración local' : 'Supabase Auth'}
            </dd>
            <dt className="text-content-muted">Alta</dt>
            <dd className="text-content-secondary">{formatDate(profile?.created_at)}</dd>
          </dl>
        </section>

        {/* Máquinas asignadas — antes no se mostraban en ninguna parte */}
        <section className="card p-5 space-y-3">
          <h4 className="text-sm font-bold text-content flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-soft" /> Máquinas asignadas
          </h4>

          {isAdmin ? (
            <p className="text-xs text-content-secondary">
              Como administrador ves <strong>todas</strong> las máquinas de la red
              {machines.length > 0 && ` (${machines.length})`}.
            </p>
          ) : !assigned?.length ? (
            <p className="text-xs text-amber-300">
              No tienes máquinas asignadas. Pide a un administrador que te asigne al menos una desde
              la pantalla de usuarios.
            </p>
          ) : (
            <p className="text-xs text-content-muted">
              Sólo ves los datos de estas {assigned.length} máquina
              {assigned.length > 1 ? 's' : ''}.
            </p>
          )}

          {loading ? (
            <p className="text-xs text-content-muted">Cargando…</p>
          ) : (
            <ul className="space-y-2">
              {machines.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/machines/${m.id}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-sunken border border-line-subtle hover:border-accent/40 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-content-secondary truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-mono text-content-faint">{m.device_id}</span>
                    </span>
                    <StatusPill status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <button onClick={logout} className="btn-danger">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </div>
  );
};
