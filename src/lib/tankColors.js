/**
 * Color por producto de los medidores de tanque.
 *
 * Es semántica de PRODUCTO, no de marca: sobrevive a un cambio de paleta a
 * propósito, para que el operario siga reconociendo cada líquido por su color.
 *
 * Antes se decidía con `sku.includes('DET')`, `includes('DES')`, etc. Con el
 * catálogo real eso dejaba los tres detergentes del mismo color y mandaba
 * JAB-MANOS y LIMP-MULTI al color por defecto. Ahora es un mapa explícito, con
 * reserva determinista por si aparece un SKU nuevo.
 */
const PALETTE = {
  cyan: { chip: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40', liquid: 'from-cyan-600 to-cyan-400' },
  pink: { chip: 'bg-pink-500/20 text-pink-200 border-pink-400/40', liquid: 'from-pink-600 to-pink-400' },
  amber: { chip: 'bg-amber-400/20 text-amber-200 border-amber-300/40', liquid: 'from-amber-500 to-amber-300' },
  emerald: { chip: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40', liquid: 'from-emerald-600 to-emerald-400' },
  orange: { chip: 'bg-orange-500/20 text-orange-100 border-orange-400/40', liquid: 'from-orange-600 to-orange-400' },
  violet: { chip: 'bg-violet-500/20 text-violet-100 border-violet-400/40', liquid: 'from-violet-600 to-violet-400' },
  sky: { chip: 'bg-sky-500/20 text-sky-200 border-sky-400/40', liquid: 'from-sky-600 to-sky-400' },
  teal: { chip: 'bg-teal-500/20 text-teal-100 border-teal-400/40', liquid: 'from-teal-600 to-teal-400' },
};

const ORDER = ['cyan', 'pink', 'amber', 'emerald', 'orange', 'violet', 'sky', 'teal'];

/** SKU reales del alta de producción. */
const BY_SKU = {
  'JAB-MANOS': 'sky',
  'LIMP-MULTI': 'emerald',
  CLORO: 'amber',
  DESENGRA: 'orange',
  SUAVIZANTE: 'pink',
  'DET-MANCHAS': 'violet',
  'DET-COLOR': 'cyan',
  'DET-TRASTES': 'teal',
};

/** Reparte de forma estable los SKU que no estén en el mapa. */
function fallbackKey(sku) {
  let hash = 0;
  for (let i = 0; i < sku.length; i += 1) hash = (hash * 31 + sku.charCodeAt(i)) >>> 0;
  return ORDER[hash % ORDER.length];
}

export function tankPalette(sku) {
  if (!sku) return PALETTE.teal;
  const key = BY_SKU[sku] || fallbackKey(String(sku).toUpperCase());
  return PALETTE[key] || PALETTE.teal;
}

export const productChipClass = (sku) => tankPalette(sku).chip;
export const liquidGradientClass = (sku) => tankPalette(sku).liquid;
