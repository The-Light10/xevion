import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTool } from "../src/tools/read.js";
import { writeTool } from "../src/tools/write.js";
import { editTool } from "../src/tools/edit.js";
import { globTool } from "../src/tools/glob.js";
import { grepTool } from "../src/tools/grep.js";
import { bashTool } from "../src/tools/bash.js";
import type { ToolContext } from "../src/tools/types.js";

const dirs: string[] = [];
function context(cwd: string): ToolContext {
  return { cwd, emit: () => undefined };
}
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "xevion-test-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("tool di base", () => {
  it("scrive e legge un file", async () => {
    const cwd = temp();
    await writeTool.run({ path: "src/a.txt", content: "ciao\nmondo\n" }, context(cwd));
    assert.equal(readFileSync(join(cwd, "src", "a.txt"), "utf8"), "ciao\nmondo\n");
    const read = await readTool.run({ path: "src/a.txt" }, context(cwd));
    assert.ok(read.includes("ciao"));
    assert.ok(read.includes("mondo"));
  });

  it("rifiuta path fuori dal progetto", async () => {
    const cwd = temp();
    await assert.rejects(readTool.run({ path: "../segreto.txt" }, context(cwd)), /fuori dal progetto/);
  });

  it("modifica solo corrispondenze univoche", async () => {
    const cwd = temp();
    writeFileSync(join(cwd, "a.txt"), "uno due uno");
    await assert.rejects(
      editTool.run({ path: "a.txt", oldString: "uno", newString: "X", replaceAll: false }, context(cwd)),
      /2 corrispondenze/,
    );
    await editTool.run({ path: "a.txt", oldString: "uno", newString: "X", replaceAll: true }, context(cwd));
    assert.equal(readFileSync(join(cwd, "a.txt"), "utf8"), "X due X");
  });

  it("trova file e testo", async () => {
    const cwd = temp();
    mkdirSync(join(cwd, "src"), { recursive: true });
    writeFileSync(join(cwd, "src", "b.ts"), "export const b = 42;\n", "utf8");
    const files = await globTool.run({ pattern: "src/**/*.ts", limit: 20 }, context(cwd));
    assert.ok(files.includes("src/b.ts"));
    const hits = await grepTool.run({ pattern: "export const", path: "src", limit: 20 }, context(cwd));
    assert.ok(hits.includes("src/b.ts"));
  });

  it("esegue un comando con timeout", async () => {
    const cwd = temp();
    const out = await bashTool.run({ command: "echo xevion-ok", timeoutMs: 5000 }, context(cwd));
    assert.ok(out.includes("xevion-ok"));
    assert.ok(out.includes("exit=0"));
  });
});
