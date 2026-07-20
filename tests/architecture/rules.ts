export type Severity = "error" | "warning";

export interface DependencyRule {
  name: string;
  description: string;
  from: RegExp;
  to: RegExp;
  allowed: boolean;
  severity: Severity;
}

export interface ImportViolation {
  rule: string;
  severity: Severity;
  file: string;
  importPath: string;
  message: string;
}

export interface ArchitectureReport {
  passed: boolean;
  violations: ImportViolation[];
  warnings: ImportViolation[];
  stats: {
    filesScanned: number;
    importsChecked: number;
    violations: number;
    warnings: number;
  };
}

export const DEPENDENCY_RULES: DependencyRule[] = [
  {
    name: "rendering-no-react",
    description: "Rendering Engine MUST NOT depend on React",
    from: /src[\\/]lib[\\/]rendering[\\/]/,
    to: /^(react|react-dom)/,
    allowed: false,
    severity: "error",
  },
  {
    name: "builder-no-react",
    description: "Builder State Engine MUST NOT depend on React",
    from: /src[\\/]lib[\\/]builder[\\/]/,
    to: /^(react|react-dom)/,
    allowed: false,
    severity: "error",
  },
  {
    name: "sdk-no-app",
    description: "SDK MUST NOT depend on Application layer",
    from: /src[\\/]sdk[\\/]/,
    to: /src[\\/]app[\\/]/,
    allowed: false,
    severity: "error",
  },
  {
    name: "core-libs-no-react",
    description: "Core platform libraries MUST NOT depend on React",
    from: /src[\\/]lib[\\/](theme|module|registry|config|capability|provider|domain|plugin|telemetry|platform)[\\/]/,
    to: /^(react|react-dom)/,
    allowed: false,
    severity: "error",
  },
  {
    name: "core-libs-no-next",
    description: "Core platform libraries MUST NOT depend on Next.js",
    from: /src[\\/]lib[\\/](theme|module|registry|config|capability|provider|domain|plugin|telemetry|platform|rendering|builder)[\\/]/,
    to: /^(next)/,
    allowed: false,
    severity: "error",
  },
  {
    name: "services-no-components",
    description: "Domain services MUST NOT import UI components",
    from: /src[\\/]services[\\/]/,
    to: /src[\\/]components[\\/]/,
    allowed: false,
    severity: "error",
  },
  {
    name: "actions-no-components",
    description: "Server Actions SHOULD NOT import UI components",
    from: /src[\\/]actions[\\/]/,
    to: /src[\\/]components[\\/]/,
    allowed: false,
    severity: "warning",
  },
  {
    name: "config-no-app",
    description: "Configuration Engine MUST NOT depend on Application pages",
    from: /src[\\/]lib[\\/]config[\\/]/,
    to: /src[\\/]app[\\/]/,
    allowed: false,
    severity: "error",
  },
  {
    name: "registry-no-app",
    description: "Core registry layer MUST NOT depend on Application pages",
    from: /src[\\/]lib[\\/]registry[\\/]/,
    to: /src[\\/]app[\\/]/,
    allowed: false,
    severity: "error",
  },
  {
    name: "infra-no-app",
    description: "Infrastructure packages MUST NOT import from app",
    from: /src[\\/]lib[\\/](module|domain|capability|provider|plugin|telemetry)[\\/]/,
    to: /src[\\/]app[\\/]/,
    allowed: false,
    severity: "error",
  },
];

export const PRESENTATION_LAYER_PATTERN = /src[\\/](app|components|actions)[\\/]/;

export const CIRCULAR_DEPENDENCY_PATHS: Array<[RegExp, RegExp]> = [
  [/src[\\/]lib[\\/]theme[\\/]/, /src[\\/]lib[\\/]rendering[\\/]/],
  [/src[\\/]lib[\\/]rendering[\\/]/, /src[\\/]lib[\\/]theme[\\/]/],
];
