import { estimateCost } from "./registry.js";
function toMessage(message) {
    if (message.role === "assistant" && message.toolCalls?.length) {
        return {
            role: "assistant",
            content: message.content || null,
            tool_calls: message.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: { name: call.name, arguments: JSON.stringify(call.arguments) },
            })),
        };
    }
    if (message.role === "tool") {
        return { role: "tool", tool_call_id: message.toolCallId ?? "", content: message.content };
    }
    return { role: message.role, content: message.content };
}
function parseCall(partial) {
    if (!partial.name)
        return undefined;
    let args = {};
    try {
        const parsed = JSON.parse(partial.arguments || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
            args = parsed;
    }
    catch {
        return undefined;
    }
    return { id: partial.id ?? `call_${Math.random().toString(36).slice(2)}`, name: partial.name, arguments: args };
}
async function* sseEvents(response, signal) {
    const reader = response.body?.getReader();
    if (!reader)
        return;
    const decoder = new TextDecoder();
    let buffer = "";
    const onAbort = () => {
        void reader.cancel().catch(() => undefined);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
            let split;
            while ((split = buffer.indexOf("\n\n")) >= 0) {
                const event = buffer.slice(0, split);
                buffer = buffer.slice(split + 2);
                for (const line of event.split("\n")) {
                    if (line.startsWith("data:"))
                        yield line.slice(5).trim();
                }
            }
        }
    }
    finally {
        signal?.removeEventListener("abort", onAbort);
        reader.releaseLock();
    }
}
export const openAICompatibleProvider = {
    id: "openai-compatible",
    async *stream(messages, tools, opts) {
        const base = (opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
        const headers = { "content-type": "application/json" };
        if (opts.apiKey)
            headers.authorization = `Bearer ${opts.apiKey}`;
        const body = {
            model: opts.model,
            messages: messages.map(toMessage),
            stream: true,
            stream_options: { include_usage: true },
        };
        if (tools.length > 0) {
            body.tools = tools.map((tool) => ({
                type: "function",
                function: { name: tool.name, description: tool.description, parameters: tool.parameters },
            }));
        }
        if (opts.format === "json")
            body.response_format = { type: "json_object" };
        if (opts.temperature !== undefined)
            body.temperature = opts.temperature;
        if (opts.maxTokens !== undefined)
            body.max_tokens = opts.maxTokens;
        let response;
        try {
            response = await fetch(`${base}/chat/completions`, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: opts.signal,
            });
        }
        catch (error) {
            if (error.name === "AbortError")
                return;
            throw new Error(`Connessione al provider non riuscita: ${error.message}`);
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`Provider HTTP ${response.status}: ${detail.slice(0, 500)}`);
        }
        const partials = new Map();
        for await (const data of sseEvents(response, opts.signal)) {
            if (data === "[DONE]")
                break;
            let chunk;
            try {
                chunk = JSON.parse(data);
            }
            catch {
                continue;
            }
            for (const choice of chunk.choices ?? []) {
                if (choice.delta?.content)
                    yield { type: "delta", text: choice.delta.content };
                for (const delta of choice.delta?.tool_calls ?? []) {
                    const current = partials.get(delta.index) ?? { arguments: "" };
                    if (delta.id)
                        current.id = delta.id;
                    if (delta.function?.name)
                        current.name = delta.function.name;
                    if (delta.function?.arguments)
                        current.arguments += delta.function.arguments;
                    partials.set(delta.index, current);
                }
                if (choice.finish_reason)
                    yield { type: "done", finishReason: choice.finish_reason };
            }
            if (chunk.usage) {
                const input = chunk.usage.prompt_tokens ?? 0;
                const output = chunk.usage.completion_tokens ?? 0;
                yield { type: "usage", inputTokens: input, outputTokens: output, costUsd: estimateCost(opts.model, input, output) };
            }
        }
        for (const partial of partials.values()) {
            const call = parseCall(partial);
            if (call)
                yield { type: "tool_call", call };
        }
    },
};
//# sourceMappingURL=openai-compatible.js.map