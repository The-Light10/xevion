import type { z } from "zod";

export type JsonSchema = Record<string, unknown>;
export type Risk = "low" | "medium" | "high";

export interface ToolContext {
  cwd: string;
  emit: (line: string) => void;
  signal?: AbortSignal;
}

export type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

export interface Tool {
  name: string;
  description: string;
  jsonSchema: JsonSchema;
  risk: Risk;
  parse: (value: unknown) => ParseResult;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export function toolSpec(tool: Tool): ToolSpec {
  return { name: tool.name, description: tool.description, parameters: tool.jsonSchema };
}

export type ToolDefinition<S extends z.ZodTypeAny> = {
  name: string;
  description: string;
  schema: S;
  jsonSchema: JsonSchema;
  risk: Risk;
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<string>;
};

export function defineTool<S extends z.ZodTypeAny>(definition: ToolDefinition<S>): Tool {
  return {
    name: definition.name,
    description: definition.description,
    jsonSchema: definition.jsonSchema,
    risk: definition.risk,
    parse(value) {
      const parsed = definition.schema.safeParse(value);
      if (parsed.success) {
        return { ok: true, value: parsed.data as Record<string, unknown> };
      }
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ");
      return { ok: false, error: detail };
    },
    run(args, ctx) {
      return definition.run(args as z.infer<S>, ctx);
    },
  };
}
