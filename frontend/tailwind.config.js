/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
        },
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        brand: {
          primary: 'var(--primary)',
          hover: 'var(--primary-hover)',
          cyan: 'var(--accent-cyan)',
        },
        status: {
          healthy: 'var(--status-healthy)',
          warning: 'var(--status-warning)',
          degraded: 'var(--status-degraded)',
          faulted: 'var(--status-faulted)',
          critical: 'var(--status-critical)',
          restored: 'var(--status-restored)',
          'open-tie': 'var(--status-open-tie)',
          unavailable: 'var(--status-unavailable)',
          info: 'var(--status-info)',
        },
        charcoal: {
          950: '#0A0E14',
          900: '#0F1520',
          800: '#151C2A',
          700: '#232D3F',
          600: '#2F3B52',
          500: '#4b5563',
        },
        electric: {
          500: '#3B82F6',
          400: '#22D3EE',
          300: '#7dd3fc',
        },
        emerald: {
          500: '#10b981',
          400: '#2DD4BF',
        },
        amber: {
          500: '#F59E0B',
          400: '#fbbf24',
        },
        crimson: {
          500: '#EF4444',
          400: '#f87171',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
