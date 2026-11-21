import type { Message, Provider, ProviderEvent, StreamOptions, ToolCall, ToolParam } from "./types.js";

type Incoming = {
  message?: {
    content?: string;
    tool_calls?: Array<{ function?: { name?: string; arguments?: Record<string, unknown> | string } }>;
  };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
};

function toMessage(message: Message): Record<string, unknown> {
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  if (message.role === "tool") {
    return { role: "tool", content: message.content, tool_name: message.name ?? "" };
  }
  return { role: message.role, content: message.content };
}

type OllamaToolCall = { function?: { name?: string; arguments?: Record<string, unknown> | string } };

function toCall(raw: OllamaToolCall): ToolCall | undefined {
  const fn = raw?.function;
  if (!fn?.name) return undefined;
  let args: Record<string, unknown> = {};
  if (typeof fn.arguments === "string") {
    try {
      const parsed: unknown = JSON.parse(fn.arguments);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed as Record<string, unknown>;
    } catch {
      return undefined;
    }
  } else if (fn.arguments && typeof fn.arguments === "object") {
    args = fn.arguments;
  }
  return { id: `local_${Math.random().toString(36).slice(2)}`, name: fn.name, arguments: args };
}

export const ollamaProvider: Provider = {
  id: "ollama",
  async *stream(messages, tools: ToolParam[], opts: StreamOptions): AsyncIterable<ProviderEvent> {
    const base = (opts.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: messages.map(toMessage),
      stream: true,
    };
    if (tools.length > 0 && opts.format !== "json") {
      body.tools = tools.map((tool) => ({
        type: "function",
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
      }));
    }
    if (opts.format === "json") body.format = "json";
    if (opts.temperature !== undefined) body.options = { temperature: opts.temperature };

    let response: Response;
    try {
      response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      throw new Error(`Runtime locale non raggiungibile: ${(error as Error).message}`);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 500)}`);
    }
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const onAbort = (): void => {
      void reader.cancel().catch(() => undefined);
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split: number;
        while ((split = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, split).trim();
          buffer = buffer.slice(split + 1);
          if (!line) continue;
          let chunk: Incoming;
          try {
            chunk = JSON.parse(line) as Incoming;
          } catch {
            continue;
          }
          if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
          if (chunk.message?.content) yield { type: "delta", text: chunk.message.content };
          for (const raw of chunk.message?.tool_calls ?? []) {
            const call = toCall(raw);
            if (call) yield { type: "tool_call", call };
          }
          if (chunk.done) {
            const input = chunk.prompt_eval_count ?? 0;
            const output = chunk.eval_count ?? 0;
            if (input || output) yield { type: "usage", inputTokens: input, outputTokens: output, costUsd: 0 };
            yield { type: "done", finishReason: "stop" };
          }
        }
      }
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
      reader.releaseLock();
    }
  },
};
