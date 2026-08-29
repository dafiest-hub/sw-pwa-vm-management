import React from 'react';
import { DoorOpen, Lock, ShieldAlert, ShieldCheck, Vibrate, DollarSign } from 'lucide-react';

export const SecurityBadge = ({ status }) => {
  if (!status) return null;

  const isSecure = !status.door_open && !status.coinbox_tampered && !status.tilt_detected;

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSecure ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Telemetría de Seguridad
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
          isSecure ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}>
          {isSecure ? 'Sistema Seguro' : 'Alerta de Seguridad'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Sensor 1: Puerta */}
        <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
          status.door_open ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <DoorOpen className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400">Puerta</div>
            <div className="font-semibold">{status.door_open ? 'ABIERTA' : 'Cerrada'}</div>
          </div>
        </div>

        {/* Sensor 2: Caja Monedas */}
        <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
          status.coinbox_tampered ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <Lock className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400">Monedero</div>
            <div className="font-semibold">{status.coinbox_tampered ? 'TAMPER / VIOLADO' : 'Seguro'}</div>
          </div>
        </div>

        {/* Sensor 3: Acelerómetro / Tilt */}
        <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
          status.tilt_detected ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <Vibrate className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400">Impacto/Tilt</div>
            <div className="font-semibold">{status.tilt_detected ? 'IMPACTO DETECTADO' : 'Normal'}</div>
          </div>
        </div>

        {/* Saldo de la sesión en curso: dinero insertado y no gastado. Se llama
            «sin reclamar» y no «disponible» desde que la ficha muestra también el
            dinero del monedero (stored_cash_balance): son dos cifras distintas y
            «Saldo Disponible» invitaba a confundirlas. */}
        <div className="p-2.5 rounded-xl bg-brand-950/40 border border-brand-800/40 text-brand-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400" title="Monedas insertadas que el cliente dejó sin gastar">
              Saldo sin reclamar
            </div>
            <div className="font-bold text-white">${Number(status.available_balance || 0).toFixed(2)} MXN</div>
          </div>
        </div>
      </div>
    </div>
  );
};
