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
        soc: {
          bg: '#0B0F17',
          card: '#131A26',
          cardHover: '#182232',
          cardBorder: '#1E293B',
          accent: '#3B82F6',
          sidebar: '#070A10',
          textMuted: '#94A3B8',
          textMain: '#F8FAFC',
          green: '#10B981',
          greenGlow: 'rgba(16, 185, 129, 0.15)',
          yellow: '#F59E0B',
          yellowGlow: 'rgba(245, 158, 11, 0.15)',
          red: '#EF4444',
          redGlow: 'rgba(239, 68, 68, 0.15)',
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.2)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'glow-yellow': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
      }
    },
  },
  plugins: [],
}
