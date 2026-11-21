import { homedir, platform } from "node:os";
import { join } from "node:path";
function envHome(name) {
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
}
export function configHome() {
    if (process.platform === "win32") {
        return join(envHome("APPDATA") ?? join(homedir(), "AppData", "Roaming"), "xevion");
    }
    if (process.platform === "darwin") {
        return join(homedir(), "Library", "Application Support", "xevion");
    }
    return envHome("XDG_CONFIG_HOME") ?? join(homedir(), ".config", "xevion");
}
export function stateHome() {
    if (process.platform === "win32") {
        return join(envHome("LOCALAPPDATA") ?? join(homedir(), "AppData", "Local"), "xevion", "state");
    }
    if (process.platform === "darwin") {
        return join(homedir(), "Library", "Application Support", "xevion", "state");
    }
    return envHome("XDG_STATE_HOME") ?? join(homedir(), ".local", "state", "xevion");
}
export function cacheHome() {
    if (process.platform === "win32") {
        return join(envHome("LOCALAPPDATA") ?? join(homedir(), "AppData", "Local"), "xevion", "cache");
    }
    if (process.platform === "darwin") {
        return join(homedir(), "Library", "Caches", "xevion");
    }
    return envHome("XDG_CACHE_HOME") ?? join(homedir(), ".cache", "xevion");
}
export const globalConfigPath = () => join(configHome(), "xevion.json");
export const sessionsDir = () => join(stateHome(), "sessions");
export const projectConfigPath = (cwd) => join(cwd, "xevion.json");
export const projectInstructionsPath = (cwd) => join(cwd, "AGENTS.md");
export const osName = () => platform();
//# sourceMappingURL=paths.js.map