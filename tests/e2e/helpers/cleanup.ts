import { execSync } from "child_process";

export interface CleanupResult {
  success: boolean;
  output: string;
  duration: number;
}

export function runCleanup(): CleanupResult {
  const start = Date.now();
  try {
    const output = execSync("npx tsx scripts/reset-alpha-dataset.ts", {
      timeout: 60000,
      encoding: "utf-8",
    });
    return {
      success: true,
      output: output.trim(),
      duration: Date.now() - start,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: msg,
      duration: Date.now() - start,
    };
  }
}
