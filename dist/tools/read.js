import { readFileSync } from "node:fs";
import { z } from "zod";
import { defineTool } from "./types.js";
import { resolveInProject } from "./safepath.js";
const schema = z.object({
    path: z.string().min(1),
    offset: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(2000).optional(),
});
export const readTool = defineTool({
    name: "read",
    description: "Legge un file di testo nel progetto, con numeri di riga.",
    schema,
    jsonSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Percorso relativo alla root del progetto" },
            offset: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 2000 },
        },
        required: ["path"],
        additionalProperties: false,
    },
    risk: "low",
    async run(args, ctx) {
        const absolute = resolveInProject(ctx.cwd, args.path);
        const text = readFileSync(absolute, "utf8");
        const lines = text.split(/\r?\n/);
        const start = Math.max(1, args.offset ?? 1);
        const end = Math.min(lines.length, start + (args.limit ?? 400) - 1);
        const body = [];
        for (let i = start; i <= end; i += 1) {
            body.push(`${String(i).padStart(6, " ")}  ${lines[i - 1]}`);
        }
        if (end < lines.length)
            body.push(`... (${lines.length - end} righe omesse)`);
        return body.join("\n");
    },
});
//# sourceMappingURL=read.js.map