/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        upec: {
          blue: "#003366",
          red: "#C00000",
          yellow: "#F4B41A",
          dark: "#0F172A",
          accent: "#10B981",
        }
      }
    },
  },
  plugins: [],
}
