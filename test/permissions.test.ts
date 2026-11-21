import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPolicy, decide, defaultPolicy } from "../src/permissions/policy.js";

describe("permessi", () => {
  it("usa regole per tool", () => {
    const policy = defaultPolicy();
    assert.equal(decide(policy, { tool: "read", args: {} }), "allow");
    assert.equal(decide(policy, { tool: "bash", args: { command: "ls" } }), "ask");
  });

  it("supporta pattern di comando e default deny", () => {
    const policy = buildPolicy({
      default: "deny",
      rules: [
        { tool: "bash", commandPattern: "^git status$", decision: "allow" },
        { tool: "bash", decision: "ask" },
      ],
    });
    assert.equal(decide(policy, { tool: "bash", args: { command: "git status" } }), "allow");
    assert.equal(decide(policy, { tool: "bash", args: { command: "rm -rf /" } }), "ask");
    assert.equal(decide(policy, { tool: "write", args: {} }), "deny");
  });
});
