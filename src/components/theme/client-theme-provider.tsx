"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DesignTokenMap, ResolvedTheme, SurfaceId, NestedTokenMap } from "@/lib/theme/types";
import { resolveTokenValue } from "@/lib/theme/validate";

interface ThemeContextValue {
  theme: ResolvedTheme | null;
  tokens: DesignTokenMap;
  nestedTokens: NestedTokenMap;
  surface: SurfaceId;
  getToken: (path: string) => string;
  isPreview: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  tokens: {},
  nestedTokens: {},
  surface: "website",
  getToken: () => "",
  isPreview: false,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ClientThemeProvider({
  children,
  resolvedTheme,
  surface = "website",
  isPreview = false,
}: {
  children: ReactNode;
  resolvedTheme: ResolvedTheme | null;
  surface?: SurfaceId;
  isPreview?: boolean;
}) {
  const tokens = resolvedTheme?.tokens ?? {};
  const nestedTokens = resolvedTheme?.nestedTokens ?? {};

  const getToken = (path: string): string => {
    const value = tokens[path];
    if (!value) return "";
    return resolveTokenValue(value);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        tokens,
        nestedTokens,
        surface,
        getToken,
        isPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
