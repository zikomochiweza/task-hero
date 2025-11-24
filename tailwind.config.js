/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        dark: {
          900: '#121212',
          800: '#1e1e1e',
          700: '#2d2d2d',
        }
      }
    },
  },
  plugins: [],
}
