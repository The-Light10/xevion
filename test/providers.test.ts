import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { openAICompatibleProvider } from "../src/providers/openai-compatible.js";
import { ollamaProvider } from "../src/providers/ollama.js";
import type { Message, ProviderEvent, ToolParam } from "../src/providers/types.js";

const servers: Server[] = [];
afterEach(async () => {
  while (servers.length) {
    const server = servers.pop()!;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function start(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function collect(iterable: AsyncIterable<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}

const messages: Message[] = [{ role: "user", content: "ciao" }];
const noTools: ToolParam[] = [];

describe("adapter provider", () => {
  it("normalizza SSE e tool call OpenAI-compatibile", async () => {
    const base = await start((req, res) => {
      void req;
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write('data: {"choices":[{"delta":{"content":"ciao"},"finish_reason":null}]}\n\n');
      res.write('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"read","arguments":"{\\"path\\":\\"a\\"}"}}]}}]}\n\n');
      res.write('data: {"choices":[{"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n');
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const events = await collect(
      openAICompatibleProvider.stream(messages, noTools, { model: "m", baseUrl: base, apiKey: "test" }),
    );
    assert.ok(events.some((e) => e.type === "delta" && e.text === "ciao"));
    const call = events.find((e) => e.type === "tool_call");
    assert.ok(call && call.type === "tool_call" && call.call.name === "read");
    assert.ok(events.some((e) => e.type === "usage" && e.inputTokens === 10));
  });

  it("normalizza NDJSON di Ollama", async () => {
    const base = await start((req, res) => {
      void req;
      res.writeHead(200, { "content-type": "application/x-ndjson" });
      res.write(`${JSON.stringify({ message: { content: "ok" }, done: false })}\n`);
      res.write(`${JSON.stringify({ done: true, prompt_eval_count: 7, eval_count: 3 })}\n`);
      res.end();
    });
    const events = await collect(ollamaProvider.stream(messages, noTools, { model: "m", baseUrl: base }));
    assert.ok(events.some((e) => e.type === "delta" && e.text === "ok"));
    assert.ok(events.some((e) => e.type === "usage" && e.inputTokens === 7));
  });
});
