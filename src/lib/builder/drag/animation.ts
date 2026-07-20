export type AnimationAction = "move" | "copy" | "insert" | "cancel" | "snap-back" | "invalid";

export interface AnimationProfile {
  action: AnimationAction;
  duration: number;
  easing: string;
  from: Partial<CSSStyleDeclaration>;
  to: Partial<CSSStyleDeclaration>;
  className: string;
}

export const animationProfiles: Record<AnimationAction, AnimationProfile> = {
  move: {
    action: "move",
    duration: 200,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    from: { opacity: "0.4", transform: "scale(0.96)" },
    to: { opacity: "1", transform: "scale(1)" },
    className: "animate-drop-move",
  },
  copy: {
    action: "copy",
    duration: 250,
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    from: { opacity: "0.3", transform: "scale(0.9)" },
    to: { opacity: "1", transform: "scale(1)" },
    className: "animate-drop-copy",
  },
  insert: {
    action: "insert",
    duration: 300,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    from: { opacity: "0", transform: "scale(0.85)" },
    to: { opacity: "1", transform: "scale(1)" },
    className: "animate-drop-insert",
  },
  cancel: {
    action: "cancel",
    duration: 150,
    easing: "cubic-bezier(0.4, 0, 1, 1)",
    from: { opacity: "0.6" },
    to: { opacity: "1" },
    className: "animate-drop-cancel",
  },
  "snap-back": {
    action: "snap-back",
    duration: 300,
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    from: {},
    to: {},
    className: "animate-snap-back",
  },
  invalid: {
    action: "invalid",
    duration: 200,
    easing: "ease-in-out",
    from: { transform: "translateX(-4px)" },
    to: { transform: "translateX(0)" },
    className: "animate-drop-invalid",
  },
};

export function getAnimation(action: AnimationAction): AnimationProfile {
  return animationProfiles[action];
}

export function createAnimationStyle(action: AnimationAction): string {
  const profile = getAnimation(action);
  const fromStr = Object.entries(profile.from).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`).join("; ");
  const toStr = Object.entries(profile.to).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`).join("; ");
  return `@keyframes ${profile.className} { from { ${fromStr} } to { ${toStr} } } .${profile.className} { animation: ${profile.className} ${profile.duration}ms ${profile.easing}; }`;
}
