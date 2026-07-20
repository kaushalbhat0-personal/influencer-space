import * as fs from "fs";
import * as path from "path";
import type { ImportViolation, ArchitectureReport } from "./rules";
import { DEPENDENCY_RULES, PRESENTATION_LAYER_PATTERN, CIRCULAR_DEPENDENCY_PATHS } from "./rules";

const SRC_DIR = path.resolve(__dirname, "../../src");

function readFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "generated") {
      readFiles(full, files);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const imports: string[] = [];
    const importRegex = /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|[^'"]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]!);
    }
    const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.push(match[1]!);
    }
    return imports;
  } catch {
    return [];
  }
}

function relativePath(filePath: string): string {
  return filePath.replace(SRC_DIR + path.sep, "").replace(/\\/g, "/");
}

function resolveImportPath(filePath: string, importPath: string): string {
  if (importPath.startsWith("@/")) return importPath.replace("@/", "src/");
  if (importPath.startsWith(".")) {
    const dir = path.dirname(filePath);
    const resolved = path.resolve(dir, importPath);
    const withExt = [".ts", ".tsx", "/index.ts", "/index.tsx"].find((ext) => fs.existsSync(resolved + ext));
    if (withExt) return path.relative(SRC_DIR, resolved + withExt).replace(/\\/g, "/");
    return path.relative(SRC_DIR, resolved).replace(/\\/g, "/") + ".ts";
  }
  return importPath;
}

export function checkRules(): ArchitectureReport {
  const files = readFiles(SRC_DIR);
  const violations: ImportViolation[] = [];
  const warnings: ImportViolation[] = [];

  let importsChecked = 0;

  for (const file of files) {
    const relFile = relativePath(file);
    const imports = extractImports(file);

    for (const imp of imports) {
      const resolved = resolveImportPath(file, imp);
      importsChecked++;

      for (const rule of DEPENDENCY_RULES) {
        if (rule.from.test(relFile) && rule.to.test(resolved)) {
          const violation: ImportViolation = {
            rule: rule.name,
            severity: rule.severity,
            file: relFile,
            importPath: resolved,
            message: `${rule.description}: "${relFile}" imports "${resolved}"`,
          };
          if (!rule.allowed) {
            if (rule.severity === "error") violations.push(violation);
            else warnings.push(violation);
          }
        }
      }
    }
  }

  for (const [a, b] of CIRCULAR_DEPENDENCY_PATHS) {
    let aToB = false;
    let bToA = false;
    for (const v of violations) {
      if (a.test(v.file) && b.test(v.importPath)) aToB = true;
      if (b.test(v.file) && a.test(v.importPath)) bToA = true;
    }
    if (aToB && bToA) {
      violations.push({
        rule: "circular-dependency",
        severity: "error",
        file: "N/A",
        importPath: "N/A",
        message: `Circular dependency detected between packages matching ${a.source} and ${b.source}`,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    stats: {
      filesScanned: files.length,
      importsChecked,
      violations: violations.length,
      warnings: warnings.length,
    },
  };
}
