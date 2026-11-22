import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("CLI version matches package.json", () => {
  const root = process.cwd();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
  const source = readFileSync(join(root, "src", "cli", "index.ts"), "utf8");
  const match = source.match(/const VERSION = "([^"]+)"/);
  assert.ok(match, "VERSION constant not found");
  assert.equal(match[1], pkg.version, "src/cli/index.ts VERSION must match package.json");
});
