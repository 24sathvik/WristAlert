/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#111111',
        primary: {
          DEFAULT: '#00FF7F',
          hover: '#00C853',
        },
        muted: {
          DEFAULT: '#888888',
          green: '#1A2E1A',
        },
        border: '#1F1F1F',
        text: {
          primary: '#F0F0F0',
          muted: '#888888'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 127, 0.08)',
      }
    },
  },
  plugins: [],
}
