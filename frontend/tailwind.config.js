/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bloomberg: {
          bg: '#000000',
          panel: '#0B0D11',
          border: '#3c3c3c',
          text: '#f2f2f2',
          primary: '#ff8c00', // Bloomberg orange accent
          secondary: '#2563eb', // A blue for generic actions
          green: '#00cc00', // For positive financial indicators
          red: '#ff0000', // For negative financial indicators
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
