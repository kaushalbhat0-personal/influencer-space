export type SignupStep = "welcome" | "persona" | "plan" | "account" | "provisioning" | "success";
export type Persona = "creator" | "agency";

export interface SignupState {
  step: SignupStep;
  persona: Persona | null;
  selectedPlan: string | null; // BillingPlan.code
  name: string;
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
}

export const STEP_ORDER: SignupStep[] = ["welcome", "persona", "plan", "account", "provisioning", "success"];
