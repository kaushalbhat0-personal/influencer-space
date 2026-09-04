import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    // RCCF-RESPONSIVE-01: every source directory that renders Tailwind classes
    // must be scanned. Previously src/features, src/modules, src/actions,
    // src/config, src/hooks, src/services and src/types were omitted, so any
    // class used ONLY inside them (e.g. lg:col-span-3 used by /admin/goals and
    // the knowledge dashboard) was silently dropped from the compiled CSS and
    // the affected layouts collapsed on desktop. src/generated is intentionally
    // excluded (Prisma client — no UI classes).
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/actions/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/services/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // RCCF-RESPONSIVE-02: container-query breakpoints mirror the screen
      // breakpoints so `@sm:`/`@lg:` behave identically to `sm:`/`lg:` on the
      // live storefront (container == viewport), while the Builder device frame
      // (a scaled div) responds to its own 375/768/1200px width. The plugin's
      // DEFAULTS (@sm=24rem/384px, @lg=32rem/512px) would break phones — 390px
      // would wrongly match @sm — so they are pinned to the screen scale.
      containers: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      colors: {
        brand: {
          primary: "var(--brand-primary, #6366F1)",
          secondary: "var(--brand-secondary, #8B5CF6)",
          accent: "var(--brand-accent, #F59E0B)",
          bg: "var(--brand-bg, #0A0A0B)",
          text: "var(--brand-text, #ffffff)",
        },
        indigo: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe",
          300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1",
          600: "#4f46e5", 700: "#4338ca", 800: "#3730a3",
          900: "#312e81", 950: "#1e1b4b",
        },
        violet: {
          50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe",
          300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6",
          600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6",
          900: "#4c1d95", 950: "#2e1065",
        },
        amber: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a",
          300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309", 800: "#92400e",
          900: "#78350f", 950: "#451a03",
        },
        // Legacy aliases — preserved for backward compat in existing component code.
        // These map to the new palette. Remove once all components use the new tokens directly.
        s8ul: {
          purple: "#8B5CF6",
          cyan: "#6366F1",
          pink: "#F59E0B",
          red: "#EF4444",
          gold: "#F59E0B",
        },
        neon: {
          cyan: "#6366F1",
          purple: "#8B5CF6",
          pink: "#F59E0B",
          gold: "#F59E0B",
          red: "#EF4444",
          green: "#22C55E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        // RCCF-VISUAL-03A: platform display/title use Geist Sans (already loaded via next/font local)
        // Body/metadata stay Inter. Storefront themes keep their own heading vars via .theme-root
        display: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "pulse-warm": "pulseWarm 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseWarm: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [
    // RCCF-RESPONSIVE-02: provides the `@container` class + `@sm:`/`@lg:`
    // container-query variants used by the hero renderer (Tailwind v3 core does
    // not include container queries — this is the official Tailwind Labs plugin).
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
