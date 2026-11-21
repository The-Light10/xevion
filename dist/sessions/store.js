import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sessionsDir } from "../config/paths.js";
function fileFor(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id))
        throw new Error("ID sessione non valido");
    return join(sessionsDir(), `${id}.jsonl`);
}
export function createSession(meta) {
    mkdirSync(sessionsDir(), { recursive: true });
    const full = {
        ...meta,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
    };
    writeFileSync(fileFor(full.id), `${JSON.stringify({ type: "meta", value: full })}\n`, "utf8");
    return full;
}
export function appendMessages(id, messages) {
    const lines = messages
        .map((message) => `${JSON.stringify({ type: "message", value: message })}\n`)
        .join("");
    appendFileSync(fileFor(id), lines, "utf8");
}
export function readSession(id) {
    const path = fileFor(id);
    if (!existsSync(path))
        return { messages: [] };
    const result = { messages: [] };
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        if (!line.trim())
            continue;
        try {
            const record = JSON.parse(line);
            if (record.type === "meta")
                result.meta = record.value;
            if (record.type === "message")
                result.messages.push(record.value);
        }
        catch {
            // riga danneggiata: ignorata
        }
    }
    return result;
}
export function listSessions() {
    if (!existsSync(sessionsDir()))
        return [];
    return readdirSync(sessionsDir())
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => readSession(name.slice(0, -6)).meta)
        .filter((meta) => Boolean(meta))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function exportMarkdown(id) {
    const session = readSession(id);
    const lines = [`# Sessione ${id}`, ""];
    for (const message of session.messages) {
        lines.push(`## ${message.role}`, "", message.content, "");
    }
    return lines.join("\n");
}
//# sourceMappingURL=store.js.map