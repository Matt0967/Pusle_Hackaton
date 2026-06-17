import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        pulse: {
          ink: "#0a1110",
          panel: "rgba(12, 20, 18, 0.74)",
          cyan: "#5de0d7",
          green: "#8ad879",
          amber: "#ffc857",
          coral: "#ff6b6b",
          violet: "#a78bfa",
        },
      },
      boxShadow: {
        hud: "0 18px 60px rgba(0, 0, 0, 0.34)",
      },
    },
  },
  plugins: [],
} satisfies Config;
