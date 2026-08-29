import React from 'react';
import { Droplet, AlertTriangle, ZapOff, RefreshCw } from 'lucide-react';
import { productChipClass, liquidGradientClass } from '../../lib/tankColors';

export const TankLevelGauge = ({ tank, onRefillClick, isTechnician }) => {
  const percentage = Math.min(100, Math.max(0, Number(tank.current_percentage || ((tank.current_liters / tank.capacity_liters) * 100).toFixed(1))));

  // El aviso de nivel bajo sale del umbral configurado del tanque
  // (low_threshold_liters), NUNCA de un porcentaje fijo: antes se usaba
  // `|| percentage < 20`, así que un tanque con 4.50 L y mínimo 3 L salía
  // «Bajo» sólo por ser el 18 % de su capacidad, contradiciendo a
  // is_above_minimum y al conteo de tanques bajos del panel.
  const capacity = Number(tank.capacity_liters);
  const threshold = Number(tank.low_threshold_liters);
  const liters = Number(tank.current_liters);
  const hasThreshold = Number.isFinite(threshold) && threshold > 0 && Number.isFinite(liters);
  // El flag vive en la base y lo escribe el consumidor; si el umbral se acaba de
  // cambiar puede ir un momento por detrás, por eso manda el cálculo en litros.
  const isLow = hasThreshold ? liters < threshold : tank.is_above_minimum === false;

  // Marca «LOW» del cilindro, a la altura real del umbral en vez de a un cuarto fijo.
  const thresholdPct =
    hasThreshold && Number.isFinite(capacity) && capacity > 0
      ? Math.min(100, Math.max(0, (threshold / capacity) * 100))
      : null;

  const isPumpOk = tank.is_pump_working !== false;

  return (
    <div className={`p-4 rounded-2xl bg-slate-900/80 border transition-all duration-300 ${
      isLow ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* Header del Tanque */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
            Tanque #{tank.tank_number}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${productChipClass(tank.product?.sku)}`}>
            {tank.product?.sku || 'S/N'}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {!isPumpOk && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30" title="Bomba con Fallo Detectado">
              <ZapOff className="w-3 h-3 text-rose-400" />
              Fallo Bomba
            </span>
          )}
          {isLow && (
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30"
              title={hasThreshold ? `${liters} L por debajo del mínimo de ${threshold} L` : 'Nivel por debajo de reserva'}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Bajo
            </span>
          )}
        </div>
      </div>

      {/* Nombre del Producto */}
      <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-2">
        {tank.product?.name || `Producto Asignado T${tank.tank_number}`}
      </h4>

      {/* Medidor de Líquido Visual (Cilindro con Gradiente) */}
      <div className="flex items-center gap-4 my-3">
        {/* Tanque Gráfico Cilíndrico */}
        <div className="relative w-14 h-36 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-end p-0.5 shadow-inner group">
          {/* Líneas de Escala / Graduación */}
          <div className="absolute inset-0 flex flex-col justify-between p-1 z-10 opacity-30 pointer-events-none">
            <div className="w-full border-b border-dashed border-white/50 text-[8px] text-white/70 pl-0.5">MAX</div>
            <div className="w-full border-b border-dashed border-white/50"></div>
            <div className="w-full border-b border-dashed border-white/50"></div>
          </div>

          {/* Marca del mínimo configurado, a su altura real */}
          {thresholdPct !== null && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none border-b border-dashed border-amber-400/70"
              style={{ bottom: `${thresholdPct}%` }}
              title={`Nivel mínimo: ${threshold} L`}
            >
              <span className="text-[8px] text-amber-300 pl-0.5">LOW</span>
            </div>
          )}

          {/* Columna de Líquido animada */}
          <div 
            className={`w-full bg-gradient-to-t ${liquidGradientClass(tank.product?.sku)} rounded-b-lg transition-all duration-700 ease-out relative`}
            style={{ height: `${percentage}%` }}
          >
            {/* Efecto superficie de líquido */}
            <div className="w-full h-1.5 bg-white/40 absolute top-0 left-0 animate-pulse" />
          </div>
        </div>

        {/* Métricas y Datos Numéricos */}
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-xs text-slate-400 font-medium">Volumen Actual</div>
            <div className="text-xl font-extrabold text-white flex items-baseline gap-1">
              {Number(tank.current_liters).toFixed(2)}
              <span className="text-xs font-normal text-slate-400">/ {Number(tank.capacity_liters).toFixed(0)} L</span>
            </div>
          </div>

          {/* Barra de Porcentaje */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span>Nivel:</span>
              <span className={isLow ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isLow ? 'bg-amber-500' : 'bg-brand-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Precio por Litro (se edita desde "Precios y niveles mínimos", nunca por tanque suelto) */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Precio/Litro:</span>
            <span className="font-bold text-emerald-400">${Number(tank.price_per_liter).toFixed(2)} MXN</span>
          </div>
        </div>
      </div>

      {/* Botón de Recarga / Purga para Técnicos */}
      {isTechnician && onRefillClick && (
        <button
          onClick={() => onRefillClick(tank)}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-brand-600/20 hover:bg-brand-600/40 text-brand-300 border border-brand-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Registrar Recarga / Mantenimiento
        </button>
      )}
    </div>
  );
};
