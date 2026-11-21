import type { ToolCall } from "../providers/types.js";

export const FALLBACK_INSTRUCTIONS = `Il modello corrente non supporta il tool calling nativo.
Per usare un tool, rispondi SOLO con un blocco cosi' fatto (nessun altro testo):

\`\`\`xevion-tool
{"tool":"read","arguments":{"path":"src/index.ts"}}
\`\`\`

Per rispondere senza tool, rispondi con testo normale.
Usa sempre JSON valido; arguments deve essere un oggetto.`;

export interface Envelope {
  calls: ToolCall[];
  final?: string;
}

function fromObject(value: unknown): Envelope | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.final === "string") return { calls: [], final: record.final };
  if (typeof record.tool !== "string") return undefined;
  const args = record.arguments && typeof record.arguments === "object" && !Array.isArray(record.arguments)
    ? (record.arguments as Record<string, unknown>)
    : {};
  return {
    calls: [{ id: `fb_${Math.random().toString(36).slice(2)}`, name: record.tool, arguments: args }],
  };
}

export function parseToolEnvelope(text: string): Envelope {
  const calls: ToolCall[] = [];
  let final: string | undefined;
  const fenced = /```xevion-tool\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenced.exec(text)) !== null) {
    try {
      const parsed = fromObject(JSON.parse(match[1].trim()) as unknown);
      if (parsed) {
        calls.push(...parsed.calls);
        final = parsed.final ?? final;
      }
    } catch {
      // bloccio non valido: ignorato, il loop segnalera' l'errore al modello
    }
  }
  if (calls.length === 0 && final === undefined) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = fromObject(JSON.parse(trimmed) as unknown);
        if (parsed) {
          calls.push(...parsed.calls);
          final = parsed.final;
        }
      } catch {
        // testo normale
      }
    }
  }
  return { calls, final };
}
