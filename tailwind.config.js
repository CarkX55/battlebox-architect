/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grimorio: {
          dark: '#1a1612',
          gold: '#c19b45',
          parchment: '#f4ece0',
        }
      }
    },
  },
  plugins: [],
}