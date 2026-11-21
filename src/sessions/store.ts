import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sessionsDir } from "../config/paths.js";
import type { Message } from "../providers/types.js";

export interface SessionMeta {
  id: string;
  createdAt: string;
  cwd: string;
  model: string;
  provider: string;
}

interface RecordLine {
  type: "meta" | "message";
  value: SessionMeta | Message;
}

function fileFor(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("ID sessione non valido");
  return join(sessionsDir(), `${id}.jsonl`);
}

export function createSession(meta: Omit<SessionMeta, "id" | "createdAt">): SessionMeta {
  mkdirSync(sessionsDir(), { recursive: true });
  const full: SessionMeta = {
    ...meta,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(fileFor(full.id), `${JSON.stringify({ type: "meta", value: full } as RecordLine)}\n`, "utf8");
  return full;
}

export function appendMessages(id: string, messages: Message[]): void {
  const lines = messages
    .map((message) => `${JSON.stringify({ type: "message", value: message } as RecordLine)}\n`)
    .join("");
  appendFileSync(fileFor(id), lines, "utf8");
}

export function readSession(id: string): { meta?: SessionMeta; messages: Message[] } {
  const path = fileFor(id);
  if (!existsSync(path)) return { messages: [] };
  const result: { meta?: SessionMeta; messages: Message[] } = { messages: [] };
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as RecordLine;
      if (record.type === "meta") result.meta = record.value as SessionMeta;
      if (record.type === "message") result.messages.push(record.value as Message);
    } catch {
      // riga danneggiata: ignorata
    }
  }
  return result;
}

export function listSessions(): SessionMeta[] {
  if (!existsSync(sessionsDir())) return [];
  return readdirSync(sessionsDir())
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => readSession(name.slice(0, -6)).meta)
    .filter((meta): meta is SessionMeta => Boolean(meta))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function exportMarkdown(id: string): string {
  const session = readSession(id);
  const lines = [`# Sessione ${id}`, ""];
  for (const message of session.messages) {
    lines.push(`## ${message.role}`, "", message.content, "");
  }
  return lines.join("\n");
}
