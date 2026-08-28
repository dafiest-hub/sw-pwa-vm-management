import { useLayoutEffect, useState } from 'react';

/**
 * Recharts necesita valores de color concretos, no var(). Se leen del DOM para
 * que las gráficas usen exactamente los mismos tokens que el resto de la UI
 * (antes eran hex sueltos dentro de Dashboard.jsx).
 */
const FALLBACK = {
  series: ['#14B8A6', '#22C55E', '#0EA5E9', '#F59E0B', '#A855F7', '#F43F5E'],
  axis: '#64748B',
  grid: '#1E293B',
  tooltipBg: '#0F172A',
  tooltipBorder: '#334155',
  tooltipText: '#FFFFFF',
};

function readToken(styles, name, fallback) {
  const raw = styles.getPropertyValue(name).trim();
  return raw ? `rgb(${raw})` : fallback;
}

export function useChartTheme() {
  const [theme, setTheme] = useState(FALLBACK);

  useLayoutEffect(() => {
    try {
      const s = getComputedStyle(document.documentElement);
      setTheme({
        series: [1, 2, 3, 4, 5, 6].map((i) => readToken(s, `--chart-${i}`, FALLBACK.series[i - 1])),
        axis: readToken(s, '--chart-axis', FALLBACK.axis),
        grid: readToken(s, '--chart-grid', FALLBACK.grid),
        tooltipBg: readToken(s, '--chart-tooltip-bg', FALLBACK.tooltipBg),
        tooltipBorder: readToken(s, '--chart-tooltip-border', FALLBACK.tooltipBorder),
        tooltipText: readToken(s, '--content-primary', FALLBACK.tooltipText),
      });
    } catch {
      /* si getComputedStyle falla, se mantienen los valores por defecto */
    }
  }, []);

  return theme;
}

/** Estilo compartido del tooltip de recharts. */
export const tooltipStyle = (theme) => ({
  backgroundColor: theme.tooltipBg,
  borderColor: theme.tooltipBorder,
  borderRadius: '12px',
  color: theme.tooltipText,
  fontSize: '12px',
});
