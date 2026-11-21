import type { Provider } from "./types.js";
import type { ProviderId } from "../config/schema.js";
import { openAICompatibleProvider } from "./openai-compatible.js";
import { ollamaProvider } from "./ollama.js";

export function getProvider(id: ProviderId): Provider {
  if (id === "ollama") return ollamaProvider;
  if (id === "openai-compatible") return openAICompatibleProvider;
  throw new Error(`Provider ${id} non disponibile in questa versione`);
}

export const DEFAULT_BASE_URL: Partial<Record<ProviderId, string>> = {
  ollama: "http://127.0.0.1:11434",
  "openai-compatible": "https://api.openai.com/v1",
};
