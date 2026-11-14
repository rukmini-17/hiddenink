/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./entrypoints/**/*.{ts,tsx,html}", "./components/**/*.{ts,tsx}", "./lib/**/*.ts"],
  theme: {
    extend: {
      // X-ray palette from docs/design/UI-SPEC.md: near-black, teal glow, violet accent.
      // `hi-*` colors are CSS variables (assets/ui.css) so dialogs can switch between light and dark.
      colors: {
        navy: "#0B1226",
        teal: { DEFAULT: "#5FE6D4", pale: "#BFFFF4" },
        violet: "#8B7CFF",
        hi: {
          bg: "var(--hi-bg)",
          fg: "var(--hi-fg)",
          muted: "var(--hi-muted)",
          faint: "var(--hi-faint)",
          quote: "var(--hi-quote)",
          border: "var(--hi-border)",
          primary: "var(--hi-primary)",
          "on-primary": "var(--hi-on-primary)",
          link: "var(--hi-link)",
          hover: "var(--hi-hover)",
          "high-bg": "var(--hi-high-bg)",
          "high-fg": "var(--hi-high-fg)",
          "med-bg": "var(--hi-med-bg)",
          "med-fg": "var(--hi-med-fg)",
        },
      },
      fontFamily: {
        sys: ["Roboto", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        dialog: "0 8px 32px rgba(0, 0, 0, 0.6)",
        "dialog-light": "0 4px 8px 3px rgba(60, 64, 67, 0.15), 0 1px 3px rgba(60, 64, 67, 0.3)",
      },
    },
  },
  plugins: [],
};
