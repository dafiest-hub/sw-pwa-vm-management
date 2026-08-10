import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Key, LogOut, CheckCircle2 } from 'lucide-react';

export const Profile = () => {
  const { user, profile, role, logout, isDemo } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Perfil de Usuario</h2>
        <p className="text-xs text-slate-400 mt-0.5">Información de la cuenta y permisos en el sistema</p>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        {/* User Card */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover ring-4 ring-brand-500/30" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-extrabold text-xl">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">{profile?.full_name || 'Usuario Vending'}</h3>
            <p className="text-xs text-slate-400">{profile?.email || user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase">
              <Shield className="w-3.5 h-3.5" />
              Rol: {role}
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div className="space-y-4 text-xs">
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">ID de Usuario:</span>
            <span className="font-mono text-slate-200">{profile?.id || user?.id || 'demo-user-id'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Proveedor de Autenticación:</span>
            <span className="font-semibold text-slate-200">{isDemo ? 'Modo Demo local' : 'Google OAuth / Supabase Auth'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Estado de Seguridad:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Activo & Verificado
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
};
