import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toDashbonesJSONSchema, dashbonesSchema } from "../src/index.js";

const schemaPath = new URL("../gospec/schema.json", import.meta.url);

test("committed gospec/schema.json is in sync with the Zod source of truth", () => {
  const committed = JSON.parse(readFileSync(schemaPath, "utf8"));
  const generated = toDashbonesJSONSchema();
  assert.deepEqual(
    generated,
    committed,
    "gospec/schema.json is out of date. Regenerate it with: npm run gen:schema",
  );
});

test("Go-marshaled dashboard shape validates against the Zod schema", () => {
  // This mirrors the round-trip dashboard produced by the Go package tests.
  const goRoundTrip = {
    theme: "red",
    boxes: [
      { type: "Simple", line1: "Q3", row: 2, column: 0, zoomed: true },
      { type: "Chart", data: [1, 2, 3, 2], line1: "VISITS", row: 4, column: 0 },
      {
        type: "Delta",
        line1: "REVENUE",
        delta: "+5.5%",
        deltaPositive: true,
        row: 5,
        column: 0,
      },
      { type: "Image", url: "https://example.com/img.png", row: 0, column: 1 },
    ],
  };

  const parsed = dashbonesSchema.parse(goRoundTrip);
  assert.equal(parsed.theme, "red");
  assert.equal(parsed.boxes.length, 4);
  assert.equal(parsed.boxes[1].type, "Chart");
  assert.equal(parsed.boxes[2].type, "Delta");
});
