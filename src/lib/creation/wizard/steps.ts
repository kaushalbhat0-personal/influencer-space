import type { GenerationStep } from "../types";

const WIZARD_STEPS: GenerationStep[] = [
  { id: "industry", label: "What do you do?", description: "Choose your industry or profession", order: 0, optional: false },
  { id: "style", label: "Choose your style", description: "Pick a visual style for your website", order: 1, optional: false },
  { id: "blueprint", label: "Choose your template", description: "Select a starting template", order: 2, optional: true },
  { id: "preview", label: "Preview", description: "See your website before it's generated", order: 3, optional: false },
  { id: "generate", label: "Generate", description: "Create your website", order: 4, optional: false },
];

export function getWizardSteps(progressive: boolean): GenerationStep[] {
  if (progressive) {
    // Beginners: fewer steps
    return WIZARD_STEPS.filter((s) => s.id !== "blueprint");
  }
  return WIZARD_STEPS;
}

export function getStepById(id: string): GenerationStep | undefined {
  return WIZARD_STEPS.find((s) => s.id === id);
}

export function getNextStep(currentId: string, progressive: boolean): GenerationStep | undefined {
  const steps = getWizardSteps(progressive);
  const currentIndex = steps.findIndex((s) => s.id === currentId);
  return steps[currentIndex + 1];
}
