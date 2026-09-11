import { dashbonesSchema } from "./schema.js";
import { layoutRules } from "./layout.js";

// Fields that the Zod schema normalizes from `boolean | "true" | "false"` into
// a plain boolean. The wire format accepts all three, so the JSON Schema must
// describe that union even though the Zod transform can't be represented.
const JSON_BOOLEAN_FIELDS = new Set([
  "zoomed",
  "highlightLine2",
  "highlightHeader",
  "deltaPositive",
]);

/**
 * The canonical JSON Schema for a Dashbones dashboard, derived from the Zod
 * schema (the source of truth). The Go package validates against this schema,
 * keeping the two implementations in sync.
 */
export function toDashbonesJSONSchema(): object {
  const schema = dashbonesSchema.toJSONSchema({
    // Transforms (e.g. boolean-name coercion) are unrepresentable; they fall
    // back to `{}` and are overwritten by `override` below.
    unrepresentable: "any",
    override({ path, jsonSchema }) {
      if (
        path.length > 0 &&
        JSON_BOOLEAN_FIELDS.has(String(path[path.length - 1]))
      ) {
        Object.assign(jsonSchema, {
          anyOf: [
            { type: "boolean" },
            { const: "true" },
            { const: "false" },
          ],
        });
      }
    },
  }) as any;

  // Cross-field layout rules can't be expressed with plain JSON Schema
  // keywords, so we annotate the box union with them. The Go generator lowers
  // these annotations into `checkLayout`, keeping Go and Zod enforced identically.
  const boxes = schema?.properties?.boxes;
  if (boxes?.items) {
    boxes.items["x-layout"] = layoutRules.map((r) => ({
      rule: r.rule,
      types: r.types,
    }));
  }

  return schema;
}

export const dashbonesJSONSchema = toDashbonesJSONSchema();
