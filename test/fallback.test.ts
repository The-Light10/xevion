import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseToolEnvelope } from "../src/core/fallback.js";

describe("fallback tool calling", () => {
  it("legge un blocco delimitato", () => {
    const text = 'prima\n```xevion-tool\n{"tool":"read","arguments":{"path":"a.txt"}}\n```\ndopo';
    const result = parseToolEnvelope(text);
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].name, "read");
    assert.deepEqual(result.calls[0].arguments, { path: "a.txt" });
  });

  it("legge JSON nudo con final", () => {
    const result = parseToolEnvelope('{"final":"fatto"}');
    assert.equal(result.final, "fatto");
    assert.equal(result.calls.length, 0);
  });

  it("ignora blocchi non validi", () => {
    const result = parseToolEnvelope("testo normale");
    assert.equal(result.calls.length, 0);
    assert.equal(result.final, undefined);
  });
});
