export type UiEvent =
  | { type: "text"; text: string }
  | { type: "tool"; status: "start" | "end"; name: string; detail?: string; ok?: boolean }
  | { type: "info"; text: string }
  | { type: "error"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; costUsd: number }
  | { type: "done" };

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
