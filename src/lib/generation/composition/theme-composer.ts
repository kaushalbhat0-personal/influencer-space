import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ThemeBlueprint } from "./types";

export class ThemeComposer {
  compose(graph: KnowledgeGraph): ThemeBlueprint {
    const palette = graph.theme;
    const isDark = palette.mode === "dark";

    return {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: isDark ? "#0F172A" : "#FFFFFF",
      text: isDark ? "#F8FAFC" : "#0F172A",
      fonts: {
        heading: palette.fontPairing?.split(" + ")[0] ?? "Inter",
        body: palette.fontPairing?.split(" + ")[1] ?? "Inter",
        monospace: "JetBrains Mono",
      },
      spacing: {
        sectionPadding: isDark ? "4rem 0" : "5rem 0",
        containerWidth: "1200px",
        gap: "1.5rem",
      },
      borderRadius: palette.borderRadius || "0.5rem",
      mode: palette.mode,
      buttons: {
        borderRadius: palette.borderRadius || "0.5rem",
        padding: "0.75rem 1.5rem",
        fontWeight: "600",
        textTransform: "none",
      },
      cards: {
        borderRadius: palette.borderRadius || "0.5rem",
        shadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.08)",
        padding: "1.5rem",
      },
      colors: {
        primary: palette.primary,
        "primary-foreground": isDark ? "#FFFFFF" : "#FFFFFF",
        secondary: palette.secondary,
        "secondary-foreground": "#FFFFFF",
        accent: palette.accent,
        "accent-foreground": "#FFFFFF",
        background: isDark ? "#0F172A" : "#FFFFFF",
        "background-secondary": isDark ? "#1E293B" : "#F8FAFC",
        text: isDark ? "#F8FAFC" : "#0F172A",
        "text-secondary": isDark ? "#94A3B8" : "#64748B",
        border: isDark ? "#334155" : "#E2E8F0",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
    };
  }
}
