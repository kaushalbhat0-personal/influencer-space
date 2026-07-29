/**
 * @deprecated Builder theme system has been removed.
 *   Use platform ThemeRegistry (registry-new.ts) for all theme operations.
 *   This adapter is kept for backward compatibility but all methods are stubs.
 *   Will be removed after all consumers migrate to ThemeRegistry.
 */
export class ThemeAdapter {
  private static instance: ThemeAdapter;
  static getInstance(): ThemeAdapter {
    if (!this.instance) this.instance = new ThemeAdapter();
    return this.instance;
  }

  getThemeConfig(): Record<string, unknown> {
    return {};
  }

  updateThemeConfig(_updates: Record<string, string>): void {
    // No-op — use updateTheme() server action instead
  }

  getCssVariables(): string {
    return "";
  }

  getColors(): { primary: string; secondary: string; accent: string; background: string; text: string } {
    return { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", text: "#fafafa" };
  }
}

export const themeAdapter = ThemeAdapter.getInstance();
