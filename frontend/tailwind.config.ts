import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 12px -2px rgb(15 23 42 / 0.06)",
        "card-hover": "0 2px 8px 0 rgb(15 23 42 / 0.08), 0 12px 24px -6px rgb(79 70 229 / 0.12)",
        glow: "0 0 0 1px rgb(99 102 241 / 0.05), 0 8px 24px -4px rgb(79 70 229 / 0.25)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "flip-in": {
          from: { transform: "rotateY(90deg)", opacity: "0" },
          to: { transform: "rotateY(0deg)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "flip-in": "flip-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
