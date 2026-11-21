import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { defineTool } from "./types.js";
import { resolveInProject } from "./safepath.js";

const schema = z.object({
  path: z.string().min(1),
  oldString: z.string().min(1),
  newString: z.string(),
  replaceAll: z.boolean().default(false),
});

export const editTool = defineTool({
  name: "edit",
  description: "Sostituisce una stringa esatta in un file. Per default richiede corrispondenza univoca.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      oldString: { type: "string" },
      newString: { type: "string" },
      replaceAll: { type: "boolean" },
    },
    required: ["path", "oldString", "newString"],
    additionalProperties: false,
  },
  risk: "high",
  async run(args, ctx) {
    const absolute = resolveInProject(ctx.cwd, args.path);
    const before = readFileSync(absolute, "utf8");
    const occurrences = before.split(args.oldString).length - 1;
    if (occurrences === 0) throw new Error("Stringa non trovata nel file");
    if (occurrences > 1 && !args.replaceAll) {
      throw new Error(`Trovate ${occurrences} corrispondenze: usa replaceAll=true o una stringa piu' lunga`);
    }
    const after = args.replaceAll
      ? before.split(args.oldString).join(args.newString)
      : before.replace(args.oldString, args.newString);
    writeFileSync(absolute, after, "utf8");
    return [
      `Modificato ${args.path}: ${occurrences} sostituzione/i`,
      `--- prima`,
      ...before.split(/\r?\n/).slice(0, 40).map((line) => `-${line}`),
      `--- dopo`,
      ...after.split(/\r?\n/).slice(0, 40).map((line) => `+${line}`),
    ].join("\n");
  },
});
