import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { z } from "zod";
import { defineTool } from "./types.js";
import { globToRegExp, resolveInProject } from "./safepath.js";

const IGNORED = new Set(["node_modules", ".git", "dist", "coverage", ".xevion"]);

function candidates(root: string, base: string, out: string[], depth = 0): void {
  if (depth > 24 || out.length >= 2000) return;
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
    if (isDir) candidates(full, base, out, depth + 1);
    else out.push(full);
  }
}

const schema = z.object({
  pattern: z.string().min(1),
  path: z.string().optional(),
  fileGlob: z.string().optional(),
  ignoreCase: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
});

export const grepTool = defineTool({
  name: "grep",
  description: "Cerca una regex nel testo dei file del progetto.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      pattern: { type: "string" },
      path: { type: "string" },
      fileGlob: { type: "string" },
      ignoreCase: { type: "boolean" },
      limit: { type: "integer", minimum: 1, maximum: 500 },
    },
    required: ["pattern"],
    additionalProperties: false,
  },
  risk: "low",
  async run(args, ctx) {
    let re: RegExp;
    try {
      re = new RegExp(args.pattern, args.ignoreCase ? "i" : "");
    } catch (error) {
      throw new Error(`Regex non valida: ${(error as Error).message}`);
    }
    const target = resolveInProject(ctx.cwd, args.path ?? ".");
    let files: string[];
    let isDirectory = false;
    try {
      isDirectory = statSync(target).isDirectory();
    } catch {
      throw new Error("Percorso non trovato");
    }
    if (isDirectory) {
      files = [];
      candidates(target, target, files);
    } else {
      files = [target];
    }
    const fileMatcher = args.fileGlob ? globToRegExp(args.fileGlob) : undefined;
    const hits: string[] = [];
    for (const file of files) {
      const rel = relative(ctx.cwd, file).split(sep).join("/");
      if (fileMatcher && !fileMatcher.test(rel)) continue;
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length && hits.length < args.limit; i += 1) {
        if (re.test(lines[i])) hits.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
      }
      if (hits.length >= args.limit) break;
    }
    if (hits.length === 0) return "Nessuna corrispondenza";
    return `${hits.length} corrispondenze:\n${hits.join("\n")}`;
  },
});
