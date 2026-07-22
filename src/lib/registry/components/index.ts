export { componentRegistry } from "./registry";
export { registerBuiltinComponents } from "./builtins";
export type {
  ComponentDefinition,
  ComponentCategory,
  ComponentAnimation,
  ComponentResponsive,
  RegistryEntry,
} from "./types";

// Auto-register built-in components
import { registerBuiltinComponents } from "./builtins";
registerBuiltinComponents();
