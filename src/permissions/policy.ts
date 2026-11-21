import { z } from "zod";

export type Decision = "allow" | "ask" | "deny";

export const policySchema = z.object({
  default: z.enum(["allow", "ask", "deny"]).default("ask"),
  rules: z
    .array(
      z.object({
        tool: z.string().optional(),
        commandPattern: z.string().optional(),
        decision: z.enum(["allow", "ask", "deny"]),
      }),
    )
    .default([]),
});

export type PermissionPolicy = z.infer<typeof policySchema>;

export interface PermissionRequest {
  tool: string;
  args: Record<string, unknown>;
  preview?: string;
}

export function defaultPolicy(): PermissionPolicy {
  return policySchema.parse({
    default: "ask",
    rules: [
      { tool: "read", decision: "allow" },
      { tool: "glob", decision: "allow" },
      { tool: "grep", decision: "allow" },
      { tool: "todo", decision: "allow" },
      { tool: "bash", decision: "ask" },
      { tool: "write", decision: "ask" },
      { tool: "edit", decision: "ask" },
      { tool: "webfetch", decision: "ask" },
    ],
  });
}

function matchesTool(ruleTool: string | undefined, tool: string): boolean {
  if (!ruleTool) return true;
  if (ruleTool === tool) return true;
  if (ruleTool.endsWith("*")) return tool.startsWith(ruleTool.slice(0, -1));
  return false;
}

function matchesCommand(pattern: string | undefined, args: Record<string, unknown>): boolean {
  if (!pattern) return true;
  const command = args.command;
  if (typeof command !== "string") return false;
  try {
    return new RegExp(pattern, "i").test(command);
  } catch {
    return command.toLowerCase().includes(pattern.toLowerCase());
  }
}

export function decide(policy: PermissionPolicy, request: PermissionRequest): Decision {
  for (const rule of policy.rules) {
    if (matchesTool(rule.tool, request.tool) && matchesCommand(rule.commandPattern, request.args)) {
      return rule.decision;
    }
  }
  return policy.default;
}

export function buildPolicy(input: Partial<PermissionPolicy>): PermissionPolicy {
  return policySchema.parse(input);
}
