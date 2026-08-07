// ── Business Health Grades (Phase 4) ────────────────────────
// Registry-driven grade bands.

import type { HealthGrade } from "../domain/types";

export const GRADE_BANDS: Array<{ grade: HealthGrade; min: number }> = [
  { grade: "A+", min: 95 },
  { grade: "A", min: 90 },
  { grade: "B", min: 80 },
  { grade: "C", min: 70 },
  { grade: "D", min: 60 },
  { grade: "F", min: 0 },
];

export function gradeFor(score: number): HealthGrade {
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band.grade;
  }
  return "F";
}

/** Next 10-point milestone above the current score (e.g. 86 → 90). */
export function nextMilestoneFor(score: number): number {
  const next = (Math.floor(score / 10) + 1) * 10;
  return Math.min(100, Math.max(10, next));
}
