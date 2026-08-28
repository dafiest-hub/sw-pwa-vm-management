import React from 'react';

/**
 * Fuente única del logo.
 *
 * Antes había tres variantes divergentes: un cuadro CSS con la letra "L" en el
 * Navbar, otro distinto en Landing y un icono `Cpu` en Login.
 *
 * El archivo es el logo de la empresa ya recortado por scripts/build-icons.mjs
 * (sin margen y con el fondo blanco convertido en transparencia). La interfaz
 * NO toma sus colores: la paleta vive en los tokens, para que el logo pueda
 * cambiar de color sin arrastrar al resto.
 */
const SIZES = {
  sm: { mark: 'h-7', text: 'text-sm' },
  md: { mark: 'h-9', text: 'text-base' },
  lg: { mark: 'h-12', text: 'text-xl' },
};

export const Logo = ({ size = 'md', variant = 'mark', className = '', showTagline = false }) => {
  const s = SIZES[size] || SIZES.md;

  const mark = (
    <img
      src="/logo.png"
      alt="LIMPIEZIOT"
      className={`${s.mark} w-auto object-contain select-none`}
      draggable="false"
    />
  );

  if (variant === 'mark') return <div className={className}>{mark}</div>;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {mark}
      {showTagline && (
        <div className="hidden sm:block leading-tight border-l border-line-subtle pl-3">
          <p className="text-[10px] font-semibold text-content-secondary">Control de máquinas</p>
          <p className="text-[10px] text-content-muted">Telemetría en tiempo real</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
