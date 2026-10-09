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
        // ── Light surfaces ──
        ivory:    { DEFAULT: '#F7F3EE', dark: '#F0EDE8', border: '#ECEAE6' },
        stone:    { DEFAULT: '#C9C6C1', light: '#ECEAE6', border: '#B0ADA8' },
        espresso: { DEFAULT: '#3B2F2F', mid: '#4E3D3D', dim: '#6B5555', deep: '#251E1E' },
        coral:    { DEFAULT: '#F4AFA5', strong: '#C0392B', mid: '#E07060', light: '#F9D6D2', text: '#8B3A30' },
        sage:     { DEFAULT: '#8E9A93', text: '#4A5C55', light: '#D4DEDA' },

        // ── Status ──
        status: {
          healthy:  '#2E7D5A',
          warning:  '#B45309',
          faulted:  '#C62828',
          isolated: '#6B21A8',
          restored: '#0B7C6B',
          resolved: '#2E7D5A',
          open:     '#78716C',
          critical: '#991B1B',
        },

        // ── Grid command-center (dark) ──
        charcoal: {
          950: '#251E1E',
          900: '#2E2525',
          800: '#3A2E2E',
          700: '#4E3D3D',
          600: '#5A4848',
          500: '#7A6060',
        },
        electric: {
          500: '#C0392B',
          400: '#E07060',
          300: '#F4AFA5',
        },
        emerald: {
          500: '#2E7D5A',
          400: '#0B7C6B',
        },
        amber: {
          500: '#B45309',
          400: '#D97706',
        },
        crimson: {
          500: '#C62828',
          400: '#EF4444',
        },
        teal: {
          500: '#0B7C6B',
          400: '#14B8A6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Atkinson Hyperlegible', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      transitionDuration: {
        'fast':   '150ms',
        'normal': '200ms',
        'slow':   '250ms',
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      },
    },
  },
  plugins: [],
}
