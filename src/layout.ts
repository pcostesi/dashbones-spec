/**
 * Cross-field layout rules that cannot be expressed with plain JSON Schema
 * keywords (they are enforced by Zod's `.check()` at runtime and emitted into
 * the canonical JSON Schema as `x-layout` annotations, which the Go generator
 * turns into `checkLayout`). Single source of truth for both.
 */

export type LayoutRuleKind =
  /** The box must sit on an even column (e.g. Delta is two columns wide). */
  | "evenColumn"
  /** The box type cannot be zoomed (e.g. Delta). */
  | "notZoomed"
  /** A zoomed box must be on an even column. */
  | "zoomedRequiresEvenColumn";

export interface LayoutRule {
  rule: LayoutRuleKind;
  types: string[];
}

export const layoutRules: LayoutRule[] = [
  { rule: "evenColumn", types: ["Delta"] },
  { rule: "notZoomed", types: ["Delta"] },
  {
    rule: "zoomedRequiresEvenColumn",
    types: ["Simple", "Stacked", "Stack", "Table", "Chart", "Image"],
  },
];