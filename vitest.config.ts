import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/architecture/**/*.test.ts", "src/features/**/__tests__/*.test.ts", "src/features/**/__tests__/*.test.tsx", "src/lib/**/__tests__/*.test.ts", "src/lib/**/__tests__/*.test.tsx", "src/modules/**/__tests__/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
