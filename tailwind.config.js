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
        background: {
          DEFAULT: '#0b0e14',
          secondary: '#121721',
          card: '#161c28',
          hover: '#1e2638',
          accent: '#252f44',
        },
        ivory: {
          50: '#fcfcf9',
          100: '#f7f7f0',
          200: '#efefe0',
          300: '#e2e2ca',
          400: '#cfcfae',
          500: '#bcbc8f',
        },
        emerald: {
          glow: '#10b981',
          bright: '#34d399',
        },
        border: {
          subtle: '#222b3d',
          active: '#3b82f6',
          speaking: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'speaking': '0 0 0 3px rgba(16, 185, 129, 0.4), 0 0 25px rgba(16, 185, 129, 0.35)',
        'speaking-glow': '0 0 30px rgba(16, 185, 129, 0.6)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'speaking-ring': 'speakingPulse 1.5s ease-out infinite',
      },
      keyframes: {
        speakingPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '0.4' },
          '100%': { transform: 'scale(1)', opacity: '0.9' },
        }
      }
    },
  },
  plugins: [],
}
