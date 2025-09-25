/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oracle: {
          dark: '#312D2A',
          darker: '#2C2825',
          medium: '#4a4541',
          light: '#7B756F',
          blue: '#0D4F8C',
          'blue-hover': '#0B4270',
        }
      }
    },
  },
  plugins: [],
}
