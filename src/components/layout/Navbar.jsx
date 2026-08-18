import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Shield, Menu, Wifi, Sparkles } from 'lucide-react';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, profile, role, logout, isDemo, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogoClick = async () => {
    await logout();
    navigate('/landing');
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return { label: 'Administrador', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'technician':
        return { label: 'Técnico Operativo', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Espectador (Viewer)', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const badge = getRoleBadge(role);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between">
      {/* Botón hamburguesa móvil & Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity text-left bg-transparent border-0 p-0"
          title="Ir a la página principal (cerrar sesión)"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            L
          </div>
          <div>
            <h1 className="font-extrabold text-white text-sm sm:text-base leading-tight tracking-tight flex items-center gap-2">
              LIMPIEZIOT Vending
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
                PWA v2.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Control & Telemetría en Tiempo Real</p>
          </div>
        </button>
      </div>

      {/* Acciones de usuario y estado demo */}
      <div className="flex items-center gap-3">
        {/* Banner Modo Demo Selector de Roles */}
        {isDemo && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium text-[11px]">Modo Demo:</span>
            <select
              value={role}
              onChange={(e) => switchDemoRole(e.target.value)}
              className="bg-slate-950 text-amber-300 text-[11px] font-bold rounded px-1.5 py-0.5 border border-amber-500/40 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="technician">Técnico</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        )}

        {/* Indicador de Conexión Realtime */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Wifi className="w-3 h-3 animate-pulse" />
          <span className="text-[11px]">Online</span>
        </div>

        {/* Menú de Usuario */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 transition-all border border-slate-800"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-lg object-cover ring-2 ring-brand-500/50" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-700">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-100 leading-tight">
                {profile?.full_name || 'Usuario Vending'}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {profile?.email || 'sesion@vending.com'}
              </div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-800">
                <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Usuario Vending'}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile?.email || user?.email}</p>
                <div className="mt-2">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <a
                  href="#profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
                >
                  <User className="w-4 h-4 text-brand-400" />
                  Mi Perfil
                </a>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
