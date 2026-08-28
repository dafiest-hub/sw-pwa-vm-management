import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Menu, Wifi, WifiOff, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Badge } from '../ui/Primitives';
import { roleLabel } from '../../lib/format';

const ROLE_TONE = { admin: 'accent', technician: 'warn', viewer: 'neutral' };

/** Estado de conexión real; antes el indicador "Online" estaba fijo en el JSX. */
function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export const Navbar = ({ onToggleSidebar }) => {
  const { user, profile, role, logout, isDemo, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // El desplegable no se cerraba ni con Escape ni al hacer clic fuera.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/landing');
  };

  const name = profile?.full_name || 'Usuario';
  const email = profile?.email || user?.email || '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="h-16 border-b border-line-subtle bg-surface-raised/90 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
          className="p-2 rounded-control text-content-muted hover:text-content hover:bg-surface-hover lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* El logo lleva al inicio. Antes cerraba la sesión. */}
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0" title="Ir al panel">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {isDemo && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-control bg-status-warn/10 border border-status-warn/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[10px] font-bold text-amber-300 uppercase">Demo</span>
            <select
              aria-label="Cambiar rol de demostración"
              value={role}
              onChange={(e) => switchDemoRole(e.target.value)}
              className="bg-surface text-amber-300 text-[10px] font-bold rounded-lg px-1.5 py-1 border border-status-warn/30 focus:outline-none"
            >
              <option value="admin">Administrador</option>
              <option value="technician">Técnico</option>
              <option value="viewer">Consulta</option>
            </select>
          </div>
        )}

        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border ${
            online
              ? 'bg-status-ok/10 border-status-ok/20 text-emerald-400'
              : 'bg-status-danger/10 border-status-danger/20 text-rose-400'
          }`}
          title={online ? 'Con conexión' : 'Sin conexión: se muestran datos en caché'}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-bold uppercase">{online ? 'En línea' : 'Sin conexión'}</span>
        </div>

        {/* Identidad del usuario, arriba a la derecha */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 p-1 pr-2 rounded-control hover:bg-surface-hover transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-accent/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-surface-hover border border-line-subtle flex items-center justify-center text-xs font-bold text-content-secondary">
                {initial}
              </div>
            )}
            <div className="hidden md:block text-left leading-tight max-w-[10rem]">
              <p className="text-xs font-bold text-content truncate">{name}</p>
              <p className="text-[10px] text-content-muted truncate">{roleLabel(role)}</p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-overlay border border-line-subtle shadow-2xl overflow-hidden animate-fade-in"
            >
              <div className="p-4 border-b border-line-subtle space-y-1">
                <p className="text-sm font-bold text-content truncate">{name}</p>
                <p className="text-[11px] text-content-muted truncate">{email}</p>
                <Badge tone={ROLE_TONE[role] || 'neutral'}>{roleLabel(role)}</Badge>
              </div>

              <div className="p-1.5">
                {/* Antes era <a href="#profile">, que con BrowserRouter no navega. */}
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold text-content-secondary hover:bg-surface-hover hover:text-content"
                >
                  <User className="w-4 h-4 text-accent-soft" /> Mi perfil
                </Link>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-control text-xs font-semibold text-rose-400 hover:bg-status-danger/10"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
