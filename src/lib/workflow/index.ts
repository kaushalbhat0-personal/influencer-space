export { WorkflowEngine, workflowEngine } from "./engine";
export type { WorkflowEvent } from "./engine";
export { triggerRegistry } from "./triggers/registry";
export { actionRegistry } from "./actions/registry";
export { registerBuiltinTriggers } from "./triggers/builtins";
export { registerBuiltinActions } from "./actions/builtins";
export type { WorkflowTrigger, TriggerContext } from "./triggers/interface";
export type { WorkflowAction, ActionContext, ActionResult } from "./actions/interface";

// Auto-register built-in triggers and actions
import { registerBuiltinTriggers } from "./triggers/builtins";
import { registerBuiltinActions } from "./actions/builtins";
registerBuiltinTriggers();
registerBuiltinActions();
