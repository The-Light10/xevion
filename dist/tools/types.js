export function toolSpec(tool) {
    return { name: tool.name, description: tool.description, parameters: tool.jsonSchema };
}
export function defineTool(definition) {
    return {
        name: definition.name,
        description: definition.description,
        jsonSchema: definition.jsonSchema,
        risk: definition.risk,
        parse(value) {
            const parsed = definition.schema.safeParse(value);
            if (parsed.success) {
                return { ok: true, value: parsed.data };
            }
            const detail = parsed.error.issues
                .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
                .join("; ");
            return { ok: false, error: detail };
        },
        run(args, ctx) {
            return definition.run(args, ctx);
        },
    };
}
//# sourceMappingURL=types.js.map