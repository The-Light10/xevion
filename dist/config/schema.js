import { z } from "zod";
export const providerIdSchema = z.enum(["ollama", "openai-compatible", "anthropic", "google"]);
export const permissionModeSchema = z.enum(["allow", "ask", "deny"]);
export const permissionRuleSchema = z.object({
    tool: z.string().optional(),
    commandPattern: z.string().optional(),
    decision: permissionModeSchema,
});
export const configSchema = z.object({
    version: z.literal(1).default(1),
    provider: providerIdSchema.default("ollama"),
    model: z.string().default("qwen2.5-coder:7b"),
    baseUrl: z.string().optional(),
    apiKeyEnv: z.string().optional(),
    asciiOnly: z.boolean().default(false),
    maxSteps: z.number().int().min(1).max(200).default(40),
    contextMessages: z.number().int().min(6).max(500).default(80),
    allowOutsideProject: z.boolean().default(false),
    defaultPermission: permissionModeSchema.default("ask"),
    rules: z.array(permissionRuleSchema).default([]),
});
export const defaultConfig = () => configSchema.parse({});
export function mergeConfig(base, override) {
    return configSchema.parse({ ...base, ...override, version: 1 });
}
//# sourceMappingURL=schema.js.map