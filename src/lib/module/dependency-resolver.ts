import type {
  ModuleId,
  ModuleDefinition,
  SemVer,
  DependencyGraph,
  DependencyNode,
} from "./types";

export function compareSemVer(a: SemVer, b: SemVer): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

export function satisfiesRange(
  version: SemVer,
  minVersion?: SemVer,
  maxVersion?: SemVer
): boolean {
  if (minVersion && compareSemVer(version, minVersion) < 0) return false;
  if (maxVersion && compareSemVer(version, maxVersion) > 0) return false;
  return true;
}

export class DependencyResolver {
  private definitions: Map<ModuleId, ModuleDefinition> = new Map();

  setDefinitions(definitions: Map<ModuleId, ModuleDefinition>): void {
    this.definitions = definitions;
  }

  buildGraph(moduleIds: ModuleId[]): DependencyGraph {
    const nodes = new Map<ModuleId, DependencyNode>();
    const edges: DependencyGraph["edges"] = [];
    const cycles: ModuleId[][] = [];
    const missingDependencies: DependencyGraph["missingDependencies"] = [];
    const versionConflicts: DependencyGraph["versionConflicts"] = [];
    const visited = new Set<ModuleId>();
    const inStack = new Set<ModuleId>();
    const stack: ModuleId[] = [];

    const dfs = (
      moduleId: ModuleId,
      depth: number
    ): boolean => {
      if (inStack.has(moduleId)) {
        const cycleStart = stack.indexOf(moduleId);
        cycles.push([...stack.slice(cycleStart), moduleId]);
        return false;
      }

      if (visited.has(moduleId)) return true;

      visited.add(moduleId);
      inStack.add(moduleId);
      stack.push(moduleId);

      const def = this.definitions.get(moduleId);
      const deps = def?.composition.dependencies ?? [];

      const missing: ModuleId[] = [];

      for (const dep of deps) {
        const depDef = this.definitions.get(dep.moduleId);

        if (depDef) {
          if (
            !satisfiesRange(
              depDef.identity.version,
              dep.minVersion,
              dep.maxVersion
            )
          ) {
            versionConflicts.push({
              moduleId,
              dependency: dep.moduleId,
              required: [
                dep.minVersion ? `>=${dep.minVersion}` : "",
                dep.maxVersion ? `<=${dep.maxVersion}` : "",
              ]
                .filter(Boolean)
                .join(" "),
              actual: depDef.identity.version,
            });
          }
        } else if (dep.required) {
          missing.push(dep.moduleId);
        }

        edges.push({
          from: moduleId,
          to: dep.moduleId,
          required: dep.required,
        });

        if (depDef) {
          dfs(dep.moduleId, depth + 1);
        }
      }

      if (missing.length > 0) {
        missingDependencies.push({ moduleId, missing });
      }

      const node: DependencyNode = {
        moduleId,
        version: def?.identity.version ?? "0.0.0" as SemVer,
        dependencies: deps,
        requiredBy: [],
        depth,
      };

      nodes.set(moduleId, node);

      stack.pop();
      inStack.delete(moduleId);
      return true;
    };

    for (const moduleId of moduleIds) {
      if (!visited.has(moduleId)) {
        dfs(moduleId, 0);
      }
    }

    for (const [id, node] of Array.from(nodes.entries())) {
      for (const [otherId, otherNode] of Array.from(nodes.entries())) {
        if (
          otherNode.dependencies.some((d) => d.moduleId === id)
        ) {
          node.requiredBy.push(otherId);
        }
      }
    }

    return {
      nodes,
      edges,
      cycles,
      missingDependencies,
      versionConflicts,
    };
  }

  detectCycles(moduleIds: ModuleId[]): ModuleId[][] {
    const graph = this.buildGraph(moduleIds);
    return graph.cycles;
  }

  topologicalSort(moduleIds: ModuleId[]): ModuleId[] {
    const graph = this.buildGraph(moduleIds);

    if (graph.cycles.length > 0) {
      return [];
    }

    const inDegree = new Map<ModuleId, number>();
    const sorted: ModuleId[] = [];
    const queue: ModuleId[] = [];

    for (const id of moduleIds) {
      inDegree.set(id, 0);
    }

    for (const edge of graph.edges) {
      if (!inDegree.has(edge.to)) continue;
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    for (const [id, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      for (const edge of graph.edges) {
        if (edge.from !== node) continue;
        if (!inDegree.has(edge.to)) continue;
        const newDegree = (inDegree.get(edge.to) ?? 0) - 1;
        inDegree.set(edge.to, newDegree);
        if (newDegree === 0) queue.push(edge.to);
      }
    }

    return sorted;
  }

  getDependencyTree(moduleId: ModuleId, depth = 0): string {
    const def = this.definitions.get(moduleId);
    if (!def) return `${"  ".repeat(depth)}${moduleId} (NOT FOUND)`;

    let result = `${"  ".repeat(depth)}${moduleId}@${def.identity.version}`;

    for (const dep of def.composition.dependencies) {
      result += "\n" + this.getDependencyTree(dep.moduleId, depth + 1);
    }

    return result;
  }
}

export const dependencyResolver = new DependencyResolver();
