import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLoop } from "../src/core/loop.js";
import { readTool } from "../src/tools/read.js";
import { defaultPolicy } from "../src/permissions/policy.js";
import type { Message, Provider, ProviderEvent, StreamOptions, ToolParam } from "../src/providers/types.js";

function fakeProvider(script: ProviderEvent[][]): Provider {
  let index = 0;
  return {
    id: "fake",
    async *stream(_messages: Message[], _tools: ToolParam[], _opts: StreamOptions): AsyncIterable<ProviderEvent> {
      const events = script[index++] ?? [{ type: "done" }];
      for (const event of events) yield event;
    },
  };
}

describe("loop agente", () => {
  it("esegue un tool call e poi termina", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "xevion-loop-"));
    try {
      writeFileSync(join(cwd, "a.txt"), "contenuto");
      const provider = fakeProvider([
        [{ type: "tool_call", call: { id: "1", name: "read", arguments: { path: "a.txt" } } }],
        [{ type: "delta", text: "fatto" }],
      ]);
      const result = await runLoop({
        provider,
        cwd,
        messages: [{ role: "system", content: "s" }, { role: "user", content: "leggi" }],
        tools: [readTool],
        policy: defaultPolicy(),
        model: "m",
        maxSteps: 5,
        contextMessages: 20,
        ask: async () => false,
        emit: () => undefined,
      });
      assert.equal(result.steps, 2);
      assert.ok(result.messages.some((m) => m.role === "tool" && m.content.includes("contenuto")));
      assert.equal(result.messages.at(-1)?.content, "fatto");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("interrompe su abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runLoop({
      provider: fakeProvider([]),
      cwd: process.cwd(),
      messages: [{ role: "user", content: "x" }],
      tools: [],
      policy: defaultPolicy(),
      model: "m",
      maxSteps: 5,
      contextMessages: 20,
      ask: async () => false,
      emit: () => undefined,
      signal: controller.signal,
    });
    assert.equal(result.interrupted, true);
  });
});
