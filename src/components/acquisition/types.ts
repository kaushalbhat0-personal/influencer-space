export type WizardStep =
  | "identity"
  | "strategy"
  | "input"
  | "preview"
  | "theme"
  | "provisioning"
  | "success"
  | "error";

export type StorefrontSubject = "myself" | "client" | "other";

export interface WizardState {
  step: WizardStep;
  subject: StorefrontSubject | null;
  strategyId: string | null;
  rawInput: string;
  error: string | null;
}
