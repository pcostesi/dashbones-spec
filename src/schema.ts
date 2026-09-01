import { z } from "zod";

/**
 * RGBa color dictionary used for theme overrides and per-box backgrounds.
 * All channels are numbers in the 0..255 range (alpha typically 0..1).
 */
export const rgbColorSchema = z.object({
  red: z.number(),
  green: z.number(),
  blue: z.number(),
  alpha: z.number(),
});

export type RgbColor = z.infer<typeof rgbColorSchema>;

/**
 * Dashbones accepts both real booleans and the string literals "true"/"false"
 * (as seen in the official demo file), so we normalize both forms.
 */
export const booleanStringSchema = z.union([
  z.boolean(),
  z
    .enum(["true", "false"])
    .transform((v) => (v === "true" ? true : false)),
]);

export type BooleanString = z.infer<typeof booleanStringSchema>;

/**
 * The predefined `theme` values supported by Dashbones v1.0.
 */
export const themeSchema = z.enum([
  "red",
  "blue",
  "yellow",
  "light",
  "dark",
]);

export type Theme = z.infer<typeof themeSchema>;

/**
 * A column position. Per the Dashbones layout, columns can only be 0, 1, 2,
 * or 3 and boxes re-flow/resize to the device's column count.
 */
export const columnSchema = z.number().int().min(0).max(3);

export type Column = z.infer<typeof columnSchema>;

/**
 * Root-level theme overrides. Each key takes an RGBa color dictionary.
 */
export const themeOverrideSchema = z.object({
  background: rgbColorSchema.optional(),
  text: rgbColorSchema.optional(),
  highlight: rgbColorSchema.optional(),
  positive: rgbColorSchema.optional(),
  negative: rgbColorSchema.optional(),
});

export type ThemeOverrides = z.infer<typeof themeOverrideSchema>;

/**
 * Common attributes shared by every box type.
 */
export const boxBaseSchema = z.object({
  row: z.number().int().min(0),
  column: columnSchema,
  /**
   * Doubles the box size. Only allowed on boxes whose column is even.
   */
  zoomed: booleanStringSchema.optional(),
  background: rgbColorSchema.optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  /**
   * Whether the first or second line should be highlighted.
   */
  highlightLine2: booleanStringSchema.optional(),
});

/**
 * `Simple` box: a single line of text.
 */
export const simpleBoxSchema = boxBaseSchema.extend({
  type: z.literal("Simple"),
  line1: z.string(),
});

/**
 * `Stacked` box: two lines of text. The docs name this type "Stacked", while
 * the official demo uses "Stack"; both are accepted here.
 */
export const stackedBoxSchema = boxBaseSchema.extend({
  type: z.union([z.literal("Stacked"), z.literal("Stack")]),
  line1: z.string(),
  line2: z.string().optional(),
});

/**
 * `Table` box: shows a headline (optionally two header rows).
 */
export const tableBoxSchema = boxBaseSchema.extend({
  type: z.literal("Table"),
  line1: z.string().optional(),
  header1: z.string().optional(),
  header2: z.string().optional(),
  highlightHeader: booleanStringSchema.optional(),
});

/**
 * `Delta` box: a headline with a small delta value behind the line1 text.
 * Deltas are two columns wide, must start on an even column, and cannot be
 * zoomed.
 */
export const deltaBoxSchema = boxBaseSchema.extend({
  type: z.literal("Delta"),
  line1: z.string().optional(),
  line2: z.string().optional(),
  delta: z.string().optional(),
  deltaPositive: booleanStringSchema.optional(),
  highlightLine2: booleanStringSchema.optional(),
  zoomed: booleanStringSchema.optional().default(false),
}).check(({ value, issues }) => {
  if (value.zoomed) {
    issues.push({
      code: "custom",
      message: "Delta boxes cannot be zoomed",
      path: ["zoomed"],
      input: value.zoomed,
    });
  }
  if (value.column % 2 !== 0) {
    issues.push({
      code: "custom",
      message: "Delta boxes must start on an even column",
      path: ["column"],
      input: value.column,
    });
  }
});

/**
 * `Chart` box: renders a bar chart whose range goes from zero to the largest
 * data value.
 */
export const chartBoxSchema = boxBaseSchema.extend({
  type: z.literal("Chart"),
  line1: z.string().optional(),
  data: z.array(z.number()),
});

/**
 * `Image` box: displays an image from a URL (available in Dashbones 1.1+).
 */
export const imageBoxSchema = boxBaseSchema.extend({
  type: z.literal("Image"),
  url: z.string(),
});

/**
 * A single box on the dashboard grid. `zoomed` may only be applied to boxes on
 * an even column.
 */
export const boxSchema = z.discriminatedUnion("type", [
  simpleBoxSchema,
  stackedBoxSchema,
  tableBoxSchema,
  deltaBoxSchema,
  chartBoxSchema,
  imageBoxSchema,
]).check(({ value, issues }) => {
  if (value.zoomed && value.column % 2 !== 0 && value.type !== "Delta") {
    issues.push({
      code: "custom",
      message: "Zoomed boxes must be on an even column",
      path: ["zoomed"],
      input: value.zoomed,
    });
  }
});

export type Box = z.infer<typeof boxSchema>;

/**
 * The top-level Dashbones dashboard document: a theme (plus optional custom
 * style overrides) and a list of boxes.
 */
export const dashbonesSchema = z.object({
  theme: themeSchema,
  boxes: z.array(boxSchema),
});

export type Dashbones = z.infer<typeof dashbonesSchema>;
