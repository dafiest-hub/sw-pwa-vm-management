/**
 * Fuente única del color de marca.
 *
 * Importable desde vite.config.js (JS plano, sin JSX) para que el manifest de
 * la PWA y el <meta name="theme-color"> no se desincronicen del CSS.
 *
 * Para recolorear la marca: cambiar BRAND_HEX aquí y las tres primitivas
 * --brand-* de src/styles/tokens.css. Nada más.
 */
export const BRAND_HEX = '#0F766E'; // teal petróleo
export const BRAND_SOFT_HEX = '#5EEAD4';
export const SURFACE_HEX = '#0B1120';

export const APP_NAME = 'LIMPIEZIOT Vending';
export const APP_LONG_NAME = 'LIMPIEZIOT · Control de Máquinas Expendedoras';
export const APP_DESCRIPTION =
  'Monitoreo y control de una red de máquinas expendedoras de productos de limpieza: tanques, ventas, caja y alertas.';
