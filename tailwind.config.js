/** @type {import('tailwindcss').Config} */

/**
 * Todos los colores apuntan a las variables de src/styles/tokens.css.
 *
 * Clave del rediseño: `brand` y `slate` se REDEFINEN aquí en lugar de
 * sustituirse archivo por archivo. Eso recolorea ~808 de las ~1000 clases de
 * color del proyecto sin tocar una sola línea de JSX.
 *
 * `brand` se mantiene como alias de `primary` por compatibilidad con el código
 * existente; el código nuevo debe usar los tokens semánticos
 * (surface / line / content / accent / status).
 */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

const RAMP = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const scale = (prefix, steps) =>
  Object.fromEntries(steps.map((s) => [s, token(`--c-${prefix}-${s}`)]));

const primary = {
  ...scale('primary', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
  DEFAULT: token('--c-primary-600'),
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary,
        // Alias de migración: los usos existentes de brand-* se recolorean solos.
        brand: primary,

        // Override del neutro de Tailwind para que lea tokens.
        slate: scale('neutral', [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950]),

        // Rampa completa a propósito: si Tailwind reemplaza la escala en vez de
        // fusionarla, las clases poco usadas (emerald-100, amber-200/900) seguirían
        // existiendo igualmente.
        emerald: scale('success', RAMP),
        amber: scale('warning', RAMP),
        rose: scale('danger', RAMP),
        sky: scale('info', RAMP),

        // Tokens semánticos: lo que debe usar el código nuevo.
        surface: {
          DEFAULT: token('--surface-base'),
          raised: token('--surface-raised'),
          sunken: token('--surface-sunken'),
          overlay: token('--surface-overlay'),
          hover: token('--surface-hover'),
        },
        line: {
          DEFAULT: token('--line-default'),
          subtle: token('--line-subtle'),
          strong: token('--line-strong'),
          focus: token('--line-focus'),
        },
        content: {
          DEFAULT: token('--content-primary'),
          secondary: token('--content-secondary'),
          muted: token('--content-muted'),
          faint: token('--content-faint'),
          inverted: token('--content-inverted'),
        },
        accent: {
          DEFAULT: token('--accent'),
          hover: token('--accent-hover'),
          soft: token('--accent-soft'),
          contrast: token('--accent-contrast'),
        },
        status: {
          ok: token('--status-ok'),
          warn: token('--status-warn'),
          danger: token('--status-danger'),
          info: token('--status-info'),
          neutral: token('--status-neutral'),
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1rem',
        control: '0.75rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'zoom-in': {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'zoom-in': 'zoom-in .15s ease-out',
      },
    },
  },
  plugins: [],
};
