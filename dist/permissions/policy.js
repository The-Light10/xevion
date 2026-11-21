import { z } from "zod";
export const policySchema = z.object({
    default: z.enum(["allow", "ask", "deny"]).default("ask"),
    rules: z
        .array(z.object({
        tool: z.string().optional(),
        commandPattern: z.string().optional(),
        decision: z.enum(["allow", "ask", "deny"]),
    }))
        .default([]),
});
export function defaultPolicy() {
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
function matchesTool(ruleTool, tool) {
    if (!ruleTool)
        return true;
    if (ruleTool === tool)
        return true;
    if (ruleTool.endsWith("*"))
        return tool.startsWith(ruleTool.slice(0, -1));
    return false;
}
function matchesCommand(pattern, args) {
    if (!pattern)
        return true;
    const command = args.command;
    if (typeof command !== "string")
        return false;
    try {
        return new RegExp(pattern, "i").test(command);
    }
    catch {
        return command.toLowerCase().includes(pattern.toLowerCase());
    }
}
export function decide(policy, request) {
    for (const rule of policy.rules) {
        if (matchesTool(rule.tool, request.tool) && matchesCommand(rule.commandPattern, request.args)) {
            return rule.decision;
        }
    }
    return policy.default;
}
export function buildPolicy(input) {
    return policySchema.parse(input);
}
//# sourceMappingURL=policy.js.map