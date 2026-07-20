import { DragBenchmark } from "./benchmark";
import { snapEngine } from "./snap";
import { constraintEngine } from "../constraints";

export interface BenchmarkScenario {
  name: string;
  nodeCount: number;
  label: string;
}

export const DRAG_SCENARIOS: BenchmarkScenario[] = [
  { name: "small", nodeCount: 50, label: "Small Document (50 nodes)" },
  { name: "medium", nodeCount: 250, label: "Medium Document (250 nodes)" },
  { name: "large", nodeCount: 1000, label: "Large Document (1,000 nodes)" },
  { name: "huge", nodeCount: 5000, label: "Huge Document (5,000 nodes)" },
];

function generateRects(count: number): Array<{ x: number; y: number; width: number; height: number }> {
  const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (let i = 0; i < count; i++) { rects.push({ x: Math.random() * 2000, y: Math.random() * 3000, width: 100 + Math.random() * 300, height: 30 + Math.random() * 100 }); }
  return rects;
}

function generateSlots(count: number): Array<{ id: string }> {
  const slots: Array<{ id: string }> = [];
  for (let i = 0; i < count; i++) slots.push({ id: `slot_${i}` });
  return slots;
}

export function runScenarios(): void {
  const benchmark = new DragBenchmark();
  const rect = { x: 200, y: 300, width: 200, height: 80 };

  console.log("=== Drag Benchmark Scenarios ===\n");

  for (const scenario of DRAG_SCENARIOS) {
    const candidates = generateRects(scenario.nodeCount);
    const result = benchmark.run(scenario.label, () => snapEngine.snap(rect, candidates), 200);
    console.log(`  ${scenario.label} — avg=${result.avg}ms p95=${result.p95}ms`);
  }

  console.log("");
  for (const scenario of DRAG_SCENARIOS) {
    const slots = generateSlots(scenario.nodeCount);
    const ctx = { elementId: "test", moduleId: "com.creatos.test", sectionId: "sec_1", pageId: "page_1", targetSectionId: "target_1", targetPageId: null, device: "desktop" as const, canvas: { pages: [{ sections: [{ slots }] }] }, metadata: {} };
    const result = benchmark.run(`${scenario.label} (constraints)`, () => constraintEngine.evaluate("max-children", ctx as Parameters<typeof constraintEngine.evaluate>[1]), 100);
    console.log(`  ${scenario.label} (constraints) — avg=${result.avg}ms p95=${result.p95}ms`);
  }

  console.log(benchmark.report());
}

export function getScalingReport(): string {
  const benchmark = new DragBenchmark();
  const rect = { x: 200, y: 300, width: 200, height: 80 };
  const lines: string[] = ["=== Scaling Report ===", ""];

  for (const scenario of DRAG_SCENARIOS) {
    const candidates = generateRects(scenario.nodeCount);
    const result = benchmark.run(scenario.label, () => snapEngine.snap(rect, candidates), 200);
    const slots = generateSlots(scenario.nodeCount);
    const ctx = { elementId: "test", moduleId: "com.creatos.test", sectionId: "sec_1", pageId: "page_1", targetSectionId: "target_1", targetPageId: null, device: "desktop" as const, canvas: { pages: [{ sections: [{ slots }] }] }, metadata: {} };
    const constResult = benchmark.run(`${scenario.label}-constraints`, () => constraintEngine.evaluate("max-children", ctx as Parameters<typeof constraintEngine.evaluate>[1]), 100);
    lines.push(`${scenario.label}: snap=${result.avg}ms (p95=${result.p95}ms), constraint=${constResult.avg}ms (p95=${constResult.p95}ms)`);
  }

  return lines.join("\n");
}
