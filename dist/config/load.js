import { existsSync, readFileSync } from "node:fs";
import { configSchema, defaultConfig } from "./schema.js";
import { globalConfigPath, projectConfigPath, projectInstructionsPath } from "./paths.js";
function readJson(path) {
    if (!existsSync(path))
        return undefined;
    try {
        const parsed = JSON.parse(readFileSync(path, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
export function loadConfig(cwd) {
    const global = readJson(globalConfigPath()) ?? {};
    const project = readJson(projectConfigPath(cwd)) ?? {};
    return configSchema.parse({ ...defaultConfig(), ...global, ...project });
}
export function loadInstructions(cwd) {
    const path = projectInstructionsPath(cwd);
    if (!existsSync(path))
        return undefined;
    try {
        const text = readFileSync(path, "utf8").trim();
        return text.length > 0 ? text : undefined;
    }
    catch {
        return undefined;
    }
}
export function configExists() {
    return existsSync(globalConfigPath());
}
//# sourceMappingURL=load.js.map