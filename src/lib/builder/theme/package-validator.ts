import type { ThemePackage, PackageValidationResult } from "./packages";

const REQUIRED_METADATA = ["id", "name", "version", "author"] as const;

export class ThemePackageValidator {
  validate(pkg: ThemePackage): PackageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of REQUIRED_METADATA) {
      if (!(pkg as unknown as Record<string, unknown>)[field]) errors.push(`Missing required field: "${field}"`);
    }

    if (!pkg.id.match(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/)) {
      errors.push(`Invalid package ID "${pkg.id}" — must be reverse-DNS format`);
    }

    if (pkg.tags.length === 0) warnings.push("No tags provided — discoverability will be limited");

    const tokenIds = new Set<string>();
    for (const group of pkg.tokens.groups) {
      for (const token of group.tokens) {
        if (tokenIds.has(token.key)) { errors.push(`Duplicate token key: "${token.key}"`); }
        tokenIds.add(token.key);
        if (token.value === "" || token.value === undefined) {
          warnings.push(`Empty value for token "${token.key}"`);
        }
      }
    }

    if (tokenIds.size === 0) errors.push("Theme package contains no tokens");

    if (pkg.compatibility?.minBuilderVersion) {
      const [pkgMajor] = pkg.compatibility.minBuilderVersion.split(".").map(Number);
      if (isNaN(pkgMajor!) || pkgMajor! < 1) errors.push(`Unsupported builder version: ${pkg.compatibility.minBuilderVersion}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateImport(json: string): PackageValidationResult {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.id || !parsed.name || !parsed.tokens) {
        return { valid: false, errors: ["Invalid theme package JSON"], warnings: [] };
      }
      return this.validate(parsed as ThemePackage);
    } catch {
      return { valid: false, errors: ["Failed to parse JSON: invalid format"], warnings: [] };
    }
  }

  importFromJson(json: string): ThemePackage | null {
    const result = this.validateImport(json);
    return result.valid ? (JSON.parse(json) as ThemePackage) : null;
  }

  exportToJson(pkg: ThemePackage): string {
    return JSON.stringify({
      id: pkg.id, name: pkg.name, version: pkg.version,
      author: pkg.author, description: pkg.description,
      tags: pkg.tags, tokens: pkg.tokens,
      compatibility: pkg.compatibility, license: pkg.license,
      metadata: pkg.metadata, exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

export const themePackageValidator = new ThemePackageValidator();
