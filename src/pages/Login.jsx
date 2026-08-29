import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { Logo } from '../components/common/Logo';

export const Login = () => {
  const { loginWithGoogle, loginWithEmail, isDemo, switchDemoRole, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Error al conectar con Google OAuth.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow ambiental de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header Marca */}
        <div className="text-center mb-8">
          <Logo size="lg" className="inline-flex mb-3" />
          <h2 className="text-2xl font-black text-white tracking-tight">LIMPIEZIOT Vending Management</h2>
          <p className="text-xs text-slate-400 mt-1">Control & Monitoreo de Máquinas Expendedoras</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Botón Iniciar Sesión con Google (Google OAuth) */}
        <button
          onClick={handleGoogleSubmit}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar con Google
        </button>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <span className="relative px-3 bg-slate-900 text-[11px] text-slate-500 font-semibold uppercase">O ingresa con email</span>
        </div>

        {/* Formulario Email / Password */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@vending.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Acceso Rápido Modo Demo */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold mb-2">
            <Sparkles className="w-4 h-4" /> Acceso Directo Modo Demo
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Prueba la plataforma con perfiles de ejemplo:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => switchDemoRole('admin')}
              className="py-1.5 px-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[11px] font-bold hover:bg-purple-500/20"
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoRole('technician')}
              className="py-1.5 px-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/20"
            >
              Técnico
            </button>
            <button
              onClick={() => switchDemoRole('viewer')}
              className="py-1.5 px-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold hover:bg-slate-700"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
