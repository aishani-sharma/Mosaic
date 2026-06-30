import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("env example documents server-side Gemini key", async () => {
  const envExample = await readFile(new URL("./.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^GEMINI_API_KEY=/m);
});
