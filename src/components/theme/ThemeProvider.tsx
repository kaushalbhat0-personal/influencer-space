import type { ReactNode } from "react";
import type { DesignTokenMap, ResolvedTheme, SurfaceId } from "@/lib/theme/types";
import { compileTokensToCssVariables, compileTokensToNestedObject } from "@/lib/theme/compiler";
import { ClientThemeProvider } from "./client-theme-provider";

interface ThemeProviderProps {
  children: ReactNode;
  tokens?: DesignTokenMap;
  resolvedTheme?: ResolvedTheme;
  surface?: SurfaceId;
  isPreview?: boolean;
}

export function ThemeProvider({
  children,
  tokens,
  resolvedTheme: resolvedThemeProp,
  surface = "website",
  isPreview = false,
}: ThemeProviderProps) {
  const effectiveTokens = tokens ?? resolvedThemeProp?.tokens ?? {};
  const cssVariables = compileTokensToCssVariables(effectiveTokens, surface);
  const nestedTokens = resolvedThemeProp?.nestedTokens ?? compileTokensToNestedObject(effectiveTokens);

  const resolvedTheme: ResolvedTheme | null = resolvedThemeProp ?? (Object.keys(effectiveTokens).length > 0
    ? {
        identity: {
          id: "runtime",
          name: "Runtime Theme",
          version: "0.0.0",
          author: { type: "platform", id: "com.creatos" },
        },
        tokens: effectiveTokens,
        nestedTokens,
        cssVariables,
        tailwindConfig: {},
        fonts: [],
        animations: [],
        layouts: [],
        surface,
      }
    : null);

  return (
    <>
      <style
        id="creatos-theme-vars"
        dangerouslySetInnerHTML={{
          __html: `:root {\n${cssVariables}\n}`,
        }}
      />
      <ClientThemeProvider
        resolvedTheme={resolvedTheme}
        surface={surface}
        isPreview={isPreview}
      >
        {children}
      </ClientThemeProvider>
    </>
  );
}
