import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IS_DEMO } from '../../lib/dataAccess';
import { 
  LayoutDashboard, 
  Cpu, 
  Package, 
  DollarSign, 
  Wrench, 
  AlertTriangle, 
  Users, 
  UserCircle,
  ChevronRight,
  ShieldCheck,
  Database
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, isTechnician, role } = useAuth();

  const navigationItems = [
    {
      name: 'Panel de control',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'technician', 'viewer']
    },
    {
      name: 'Máquinas Vending',
      path: '/machines',
      icon: Cpu,
      roles: ['admin', 'technician', 'viewer']
    },
    {
      name: 'Catálogo de Productos',
      path: '/products',
      icon: Package,
      roles: ['admin', 'technician', 'viewer']
    },
    {
      name: 'Ventas e Ingresos',
      path: '/sales',
      icon: DollarSign,
      roles: ['admin', 'technician', 'viewer']
    },
    {
      name: 'Operaciones & Recargas',
      path: '/operations',
      icon: Wrench,
      roles: ['admin', 'technician']
    },
    {
      name: 'Alertas e Incidencias',
      path: '/alerts',
      icon: AlertTriangle,
      roles: ['admin', 'technician', 'viewer']
    },
    {
      name: 'Gestión de Usuarios',
      path: '/users',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'Mi Perfil',
      path: '/profile',
      icon: UserCircle,
      roles: ['admin', 'technician', 'viewer']
    }
  ];

  const filteredItems = navigationItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Overlay Móvil */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-300 ease-in-out flex flex-col justify-between
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Enlaces de Navegación */}
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menú de Control
          </div>

          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 font-bold' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </div>

        {/* Origen de los datos. Antes había aquí tres afirmaciones fijas y falsas
            ("Firmware actualizado", "Supabase RLS Protection"). */}
        <div className="p-4 border-t border-line-subtle bg-surface/40">
          <div className="p-3 rounded-xl bg-surface-raised border border-line-subtle text-[11px] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              {IS_DEMO ? (
                <>
                  <Database className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">Modo demostración</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-content-secondary">Conectado a Supabase</span>
                </>
              )}
            </div>
            <div className="text-content-muted text-[10px]">
              {IS_DEMO
                ? 'Datos de ejemplo en memoria, sin conexión a la base.'
                : 'Los datos provienen de la base de producción.'}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
