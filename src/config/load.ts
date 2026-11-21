import { existsSync, readFileSync } from "node:fs";
import { configSchema, defaultConfig, type XevionConfig } from "./schema.js";
import { globalConfigPath, projectConfigPath, projectInstructionsPath } from "./paths.js";

function readJson(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function loadConfig(cwd: string): XevionConfig {
  const global = readJson(globalConfigPath()) ?? {};
  const project = readJson(projectConfigPath(cwd)) ?? {};
  return configSchema.parse({ ...defaultConfig(), ...global, ...project });
}

export function loadInstructions(cwd: string): string | undefined {
  const path = projectInstructionsPath(cwd);
  if (!existsSync(path)) return undefined;
  try {
    const text = readFileSync(path, "utf8").trim();
    return text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}

export function configExists(): boolean {
  return existsSync(globalConfigPath());
}
