import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ede6ff",
          100: "#c4b0ff",
          200: "#9b7aff",
          300: "#7244ff",
          400: "#490eff",
          500: "#2D1B69",
          600: "#241554",
          700: "#1b0f3f",
          800: "#120a2a",
          900: "#090515",
          950: "#04020a",
        },
        secondary: {
          50: "#e6ffff",
          100: "#b3ffff",
          200: "#80ffff",
          300: "#4dffff",
          400: "#1affff",
          500: "#00f5ff",
          600: "#00c4cc",
          700: "#009399",
          800: "#006266",
          900: "#003133",
          950: "#001919",
        },
        accent: {
          50: "#ffe6fc",
          100: "#ffb3f5",
          200: "#ff80ee",
          300: "#ff4de7",
          400: "#ff1ae0",
          500: "#ff00e5",
          600: "#cc00b8",
          700: "#99008a",
          800: "#66005c",
          900: "#33002e",
          950: "#1a0017",
        },
        s8ul: {
          purple: "#2D1B69",
          cyan: "#00f5ff",
          pink: "#ff00e5",
          red: "#ff0040",
          gold: "#FFD700",
        },
        neon: {
          cyan: "#00f5ff",
          purple: "#a855f7",
          pink: "#ff00e5",
          gold: "#FFD700",
          red: "#ff0040",
          green: "#39ff14",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Orbitron", "monospace"],
      },
      animation: {
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
        "scan-line": "scanLine 3s linear infinite",
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
