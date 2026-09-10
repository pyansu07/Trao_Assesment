import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dce6ff",
          200: "#b8ccff",
          300: "#8aa9ff",
          400: "#5c80ff",
          500: "#3d5cf5",
          600: "#2c42d6",
          700: "#2432ab",
          800: "#202b87",
          900: "#1c266b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
