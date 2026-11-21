import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { z } from "zod";
import { defineTool } from "./types.js";
import { globToRegExp, resolveInProject } from "./safepath.js";

const IGNORED = new Set(["node_modules", ".git", "dist", "coverage", ".xevion"]);

function walk(root: string, base: string, out: string[], depth = 0): void {
  if (depth > 24 || out.length >= 500) return;
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const name of entries) {
    if (IGNORED.has(name) || name.startsWith(".")) continue;
    const full = join(root, name);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    const rel = relative(base, full).split(sep).join("/");
    if (isDir) walk(full, base, out, depth + 1);
    else out.push(rel);
  }
}

const schema = z.object({
  pattern: z.string().min(1),
  path: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const globTool = defineTool({
  name: "glob",
  description: "Cerca file nel progetto tramite pattern (es. src/**/*.ts).",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      pattern: { type: "string" },
      path: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 500 },
    },
    required: ["pattern"],
    additionalProperties: false,
  },
  risk: "low",
  async run(args, ctx) {
    const base = resolveInProject(ctx.cwd, args.path ?? ".");
    const files: string[] = [];
    walk(base, base, files);
    const pattern = args.pattern.includes("/") ? args.pattern : `**/${args.pattern}`;
    const matcher = globToRegExp(pattern);
    const matches = files.filter((file) => matcher.test(file)).slice(0, args.limit);
    if (matches.length === 0) return "Nessun file trovato";
    return `${matches.length} file:\n${matches.join("\n")}`;
  },
});
