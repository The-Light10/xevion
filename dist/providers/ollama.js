function toMessage(message) {
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
function toCall(raw) {
    const fn = raw?.function;
    if (!fn?.name)
        return undefined;
    let args = {};
    if (typeof fn.arguments === "string") {
        try {
            const parsed = JSON.parse(fn.arguments);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
                args = parsed;
        }
        catch {
            return undefined;
        }
    }
    else if (fn.arguments && typeof fn.arguments === "object") {
        args = fn.arguments;
    }
    return { id: `local_${Math.random().toString(36).slice(2)}`, name: fn.name, arguments: args };
}
export const ollamaProvider = {
    id: "ollama",
    async *stream(messages, tools, opts) {
        const base = (opts.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "");
        const body = {
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
        if (opts.format === "json")
            body.format = "json";
        if (opts.temperature !== undefined)
            body.options = { temperature: opts.temperature };
        let response;
        try {
            response = await fetch(`${base}/api/chat`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
                signal: opts.signal,
            });
        }
        catch (error) {
            if (error.name === "AbortError")
                return;
            throw new Error(`Runtime locale non raggiungibile: ${error.message}`);
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 500)}`);
        }
        if (!response.body)
            return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const onAbort = () => {
            void reader.cancel().catch(() => undefined);
        };
        opts.signal?.addEventListener("abort", onAbort, { once: true });
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                let split;
                while ((split = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, split).trim();
                    buffer = buffer.slice(split + 1);
                    if (!line)
                        continue;
                    let chunk;
                    try {
                        chunk = JSON.parse(line);
                    }
                    catch {
                        continue;
                    }
                    if (chunk.error)
                        throw new Error(`Ollama: ${chunk.error}`);
                    if (chunk.message?.content)
                        yield { type: "delta", text: chunk.message.content };
                    for (const raw of chunk.message?.tool_calls ?? []) {
                        const call = toCall(raw);
                        if (call)
                            yield { type: "tool_call", call };
                    }
                    if (chunk.done) {
                        const input = chunk.prompt_eval_count ?? 0;
                        const output = chunk.eval_count ?? 0;
                        if (input || output)
                            yield { type: "usage", inputTokens: input, outputTokens: output, costUsd: 0 };
                        yield { type: "done", finishReason: "stop" };
                    }
                }
            }
        }
        finally {
            opts.signal?.removeEventListener("abort", onAbort);
            reader.releaseLock();
        }
    },
};
//# sourceMappingURL=ollama.js.map