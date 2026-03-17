/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f8f4",
          100: "#e9f0e1",
          200: "#cadbb8",
          300: "#abc68f",
          400: "#8db066",
          500: "#6f9b3d",
          600: "#577a2f",
          700: "#405b22",
          800: "#293b16",
          900: "#121c09"
        }
      }
    }
  },
  darkMode: "class",
  plugins: []
};
