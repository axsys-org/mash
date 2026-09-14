export type MotionTier = "fast" | "moderate" | "slow";
const fallback = { fast: [80, 60], moderate: [160, 120], slow: [240, 160] } as const;

/** Native animation options resolved from the same semantic tokens as CSS recipes. */
export function motionTiming(
  tier: MotionTier,
  phase: "enter" | "exit" = "enter",
  scope?: HTMLElement,
): KeyframeAnimationOptions & { duration: number; easing: string } {
  const view = scope?.ownerDocument.defaultView ?? (typeof window === "undefined" ? null : window);
  const style = scope && view ? view.getComputedStyle(scope) : undefined;
  const token = style?.getPropertyValue(`--duration-${tier}-${phase}`).trim() ?? "";
  const parsed = parseFloat(token) * (token.endsWith("ms") ? 1 : 1000);
  const duration = Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : fallback[tier][phase === "enter" ? 0 : 1];
  const spatial = tier === "slow" && phase === "enter";
  return {
    duration: view?.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration,
    easing:
      style?.getPropertyValue(spatial ? "--easing-spring-surface" : "--easing-settle").trim() ||
      (spatial ? "cubic-bezier(0.22, 1.15, 0.36, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)"),
  };
}

/** Guard for consumers that defer unmounting; prefer the motion completion event. */
export function exitFallbackMs(tier: MotionTier, scope?: HTMLElement): number {
  return motionTiming(tier, "exit", scope).duration + 100;
}
