import { writeFileSync } from "node:fs";
import { toDashbonesJSONSchema } from "../src/to-json-schema.js";

const jsonSchema = toDashbonesJSONSchema();

writeFileSync(
  new URL("../gospec/schema.json", import.meta.url),
  JSON.stringify(jsonSchema, null, 2) + "\n",
);
console.log("Wrote gospec/schema.json");
