/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./entrypoints/**/*.{ts,tsx,html}", "./components/**/*.{ts,tsx}", "./lib/**/*.ts"],
  theme: {
    extend: {
      // Warm, calm palette: paper background, ink text, amber highlights. No alarm red.
      colors: {
        ink: { DEFAULT: "#1f2a44", soft: "#3b4866", faint: "#8a93a8" },
        paper: { DEFAULT: "#fbf7f0", deep: "#f1eadf" },
        amber: { DEFAULT: "#e8a33d", soft: "#f6d8a4" },
        teal: { DEFAULT: "#2a9d8f", soft: "#cdebe6" },
      },
      boxShadow: { card: "0 10px 30px rgba(31, 42, 68, 0.18)" },
    },
  },
  plugins: [],
};
