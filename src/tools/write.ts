import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { defineTool } from "./types.js";
import { resolveInProject } from "./safepath.js";

const schema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const writeTool = defineTool({
  name: "write",
  description: "Crea o sovrascrive un file nel progetto.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  risk: "high",
  async run(args, ctx) {
    const absolute = resolveInProject(ctx.cwd, args.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, args.content, "utf8");
    const lines = args.content.split(/\r?\n/).length;
    return `Scritto ${args.path} (${lines} righe, ${args.content.length} byte)`;
  },
});
