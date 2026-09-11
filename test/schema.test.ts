import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dashbonesSchema,
  simpleBoxSchema,
  deltaBoxSchema,
  boxSchema,
} from "../src/index.js";

test("parses the example JSON from the Dashbones docs", () => {
  const doc = {
    theme: "blue",
    boxes: [
      {
        zoomed: "true",
        type: "Simple",
        line1: "Hello",
        row: 0,
        column: 0,
      },
      {
        type: "Stacked",
        line1: "FOO",
        line2: "BAR",
        row: 0,
        column: 2,
      },
    ],
  };

  const parsed = dashbonesSchema.parse(doc);
  assert.equal(parsed.theme, "blue");
  assert.equal(parsed.boxes.length, 2);
  assert.equal(parsed.boxes[0].zoomed, true);
  assert.equal(parsed.boxes[0].type, "Simple");
  assert.equal(parsed.boxes[1].type, "Stacked");
});

test("parses the official demo file (string booleans, Stack alias)", () => {
  const demo = {
    theme: "red",
    boxes: [
      { zoomed: "true", type: "Simple", line1: "Q3", row: 2, column: 0 },
      { type: "Stack", line1: "WEEK", line2: "36", row: 0, column: 2 },
      {
        type: "Chart",
        data: [1, 2, 3, 2, 4, 2, 6, 6, 4, 4, 5, 7, 4, 5],
        line1: "VISITS",
        row: 4,
        column: 0,
      },
      {
        type: "Delta",
        line1: "REVENUE",
        line2: "$12,345",
        delta: "+5.5%",
        deltaPositive: "true",
        row: 5,
        column: 0,
      },
    ],
  };

  const parsed = dashbonesSchema.parse(demo);
  assert.equal(parsed.boxes[1].type, "Stack");
  assert.equal(parsed.boxes[3].type, "Delta");
});

test("rejects a Delta on an odd column", () => {
  const bad = {
    type: "Delta",
    line1: "USD:ISK",
    delta: "-1%",
    row: 3,
    column: 2,
  };
  // odd column 3 should be rejected
  const result = deltaBoxSchema.safeParse({ ...bad, column: 3 });
  assert.equal(result.success, false);
});

test("accepts a Delta on an even column", () => {
  const result = deltaBoxSchema.safeParse({
    type: "Delta",
    line1: "REVENUE",
    column: 0,
    row: 0,
  });
  assert.equal(result.success, true);
});

test("rejects a zoomed box on an odd column", () => {
  const result = boxSchema.safeParse({
    type: "Simple",
    line1: "x",
    zoomed: "true",
    row: 0,
    column: 1,
  });
  assert.equal(result.success, false);
});

test("rejects an unknown theme", () => {
  const result = dashbonesSchema.safeParse({
    theme: "purple",
    boxes: [],
  });
  assert.equal(result.success, false);
});

test("rejects a column outside 0..3", () => {
  const result = simpleBoxSchema.safeParse({
    type: "Simple",
    line1: "x",
    row: 0,
    column: 4,
  });
  assert.equal(result.success, false);
});

test("parses boolean value for zoomed", () => {
  const result = simpleBoxSchema.safeParse({
    type: "Simple",
    line1: "x",
    zoomed: true,
    row: 0,
    column: 0,
  });
  assert.equal(result.success, true);
});

test("parses root theme overrides", () => {
  const result = dashbonesSchema.safeParse({
    theme: "dark",
    background: { red: 0, green: 0, blue: 0, alpha: 1 },
    text: { red: 255, green: 255, blue: 255, alpha: 1 },
    positive: { red: 0, green: 255, blue: 0, alpha: 0.8 },
    boxes: [],
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.background, {
      red: 0,
      green: 0,
      blue: 0,
      alpha: 1,
    });
    assert.equal(result.data.text?.green, 255);
  }
});
