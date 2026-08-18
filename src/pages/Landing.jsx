import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  TrendingUp, 
  Droplet, 
  Smartphone, 
  Activity, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  BarChart3,
  Globe
} from 'lucide-react';

export const Landing = () => {
  const { switchDemoRole, user, isDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoAccess = (role = 'admin') => {
    switchDemoRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Glows ambientales de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-600/15 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Landing */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between relative z-20 border-b border-slate-800/60">
        <Link to={user && !isDemo ? '/dashboard' : '/landing'} className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
            L
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight flex items-center gap-2">
              LIMPIEZIOT Vending
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
                Plataforma de Control
              </span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:block">Plataforma Inteligente para tu Negocio de Vending</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 transition-all"
            >
              Ir al Panel de Control
            </Link>
          ) : (
            <>
              <button
                onClick={() => handleDemoAccess('admin')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all"
              >
                <Sparkles className="w-4 h-4" /> Probar Demo
              </button>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95"
              >
                Iniciar Sesión
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold animate-pulse">
          <Zap className="w-4 h-4 text-cyan-400" />
          Potencia la Rentabilidad y Automatización de tus Máquinas Expendedoras
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none max-w-4xl mx-auto">
          Toma el Control Total de tu Negocio Vending en <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400">Tiempo Real</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Maximiza tus ventas, elimina las pérdidas de efectivo y garantiza que tus máquinas nunca se queden sin producto. Supervisa tus ingresos y la operación diaria desde cualquier lugar.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Acceder al Panel del Negocio
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => handleDemoAccess('admin')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Explorar Demo Interactiva (Sin registro)
          </button>
        </div>

        {/* Badges de confianza */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Monitoreo 24/7 sin interrupciones
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Control de Inventario y Múltiples Productos
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acceso desde Cualquier Dispositivo (Celular o PC)
          </span>
        </div>
      </section>

      {/* Grid de Beneficios de Negocio */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-800/80 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            ¿Por qué escalar tu negocio con LIMPIEZIOT?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Una solución diseñada para hacer crecer tus ventas de productos de limpieza con control total de tus ingresos y stock en tiempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 w-fit group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Monitoreo Operativo en Tiempo Real</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visualiza al instante el saldo acumulado en monedero, el estado de tus máquinas y el volumen dispensado de cada producto en tiempo real.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Protección Total & Control Anti-Fraude</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protege tu inversión con alertas inmediatas ante aperturas no autorizadas, manipulación de la caja de dinero o intentos de vandalismo.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Auditoría Financiera Transparente</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Obtén reportes exactos de ingresos por cada método de pago (efectivo, monedas y tarjeta) comparados con las ventas totales de producto.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit group-hover:scale-110 transition-transform">
              <Droplet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Gestión Inteligente de Inventario</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Controla el nivel exacto de cada tanque, ajusta precios por litro al instante y recibe avisos automáticos antes de quedarte sin insumos.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Acceso Inmediato desde tu Celular</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gestiona tu negocio como una aplicación móvil en tu teléfono o computadora, con carga ultrarrápida y máxima comodidad de uso.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/40 transition-all space-y-4 group">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Alta Disponibilidad & Menores Costos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Infraestructura moderna que reduce tus costos operativos, garantiza máxima velocidad de respuesta y asegura el crecimiento continuo de tu red.
            </p>
          </div>
        </div>
      </section>

      {/* Muestra Visual Interactiva */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950/60 border border-brand-500/30 shadow-2xl space-y-6 text-center">
          <span className="text-[10px] px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-bold uppercase tracking-wider">
            Plataforma Interactiva
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-white">
            ¿Listo para maximizar las ganancias de tu negocio vending?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
            Inicia sesión para gestionar tus máquinas o explora la demostración interactiva sin compromiso.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/20 transition-all"
            >
              Iniciar Sesión con Google
            </Link>
            <button
              onClick={() => handleDemoAccess('admin')}
              className="px-6 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all"
            >
              Probar Demo como Admin
            </button>
            <button
              onClick={() => handleDemoAccess('technician')}
              className="px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all"
            >
              Probar Demo como Técnico
            </button>
          </div>
        </div>
      </section>

      {/* Footer Landing */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 LIMPIEZIOT Vending Management. Plataforma de Control Inteligente para Expendedoras de Productos de Limpieza.</p>
        <p className="text-[10px] text-slate-600">Optimizada para máxima rentabilidad y control operacional en tiempo real.</p>
      </footer>
    </div>
  );
};
