import { spawn } from "node:child_process";
import { z } from "zod";
import { defineTool } from "./types.js";
import { redact } from "../security/redact.js";
const schema = z.object({
    command: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(600000).default(120000),
});
function shell() {
    if (process.platform === "win32") {
        if (process.env.PSModulePath) {
            return { command: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-Command"] };
        }
        return { command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c"] };
    }
    return { command: "/bin/sh", args: ["-c"] };
}
export const bashTool = defineTool({
    name: "bash",
    description: "Esegue un comando nella shell di sistema con timeout e cwd del progetto.",
    schema,
    jsonSchema: {
        type: "object",
        properties: {
            command: { type: "string" },
            timeoutMs: { type: "integer", minimum: 100, maximum: 600000 },
        },
        required: ["command"],
        additionalProperties: false,
    },
    risk: "high",
    async run(args, ctx) {
        const sh = shell();
        return await new Promise((resolve, reject) => {
            let settled = false;
            const child = spawn(sh.command, [...sh.args, args.command], {
                cwd: ctx.cwd,
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env },
            });
            let stdout = "";
            let stderr = "";
            let timedOut = false;
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
            });
            const finish = () => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                ctx.signal?.removeEventListener("abort", onAbort);
                const body = [
                    redact(stdout.trim()),
                    redact(stderr.trim()) ? `STDERR: ${redact(stderr.trim())}` : "",
                    `exit=${child.exitCode ?? -1}${timedOut ? " (timeout)" : ""}`,
                ]
                    .filter(Boolean)
                    .join("\n");
                resolve(body || "(nessun output)");
            };
            const kill = (reason) => {
                if (reason === "timeout")
                    timedOut = true;
                child.kill("SIGKILL");
            };
            const timer = setTimeout(() => kill("timeout"), args.timeoutMs);
            const onAbort = () => kill("abort");
            ctx.signal?.addEventListener("abort", onAbort, { once: true });
            child.on("error", (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                reject(error);
            });
            child.on("close", finish);
        });
    },
});
//# sourceMappingURL=bash.js.map