import { decide } from "../permissions/policy.js";
import { toolSpec } from "../tools/types.js";
import { redact } from "../security/redact.js";
import { parseToolEnvelope } from "./fallback.js";
export async function runLoop(options) {
    const { provider, tools, policy, ask, emit, signal } = options;
    const messages = [...options.messages];
    const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
    let interrupted = false;
    let steps = 0;
    for (let step = 0; step < options.maxSteps; step += 1) {
        if (signal?.aborted) {
            interrupted = true;
            break;
        }
        steps = step + 1;
        if (messages.length > options.contextMessages) {
            const system = messages[0]?.role === "system" ? [messages[0]] : [];
            const tail = messages.slice(-(options.contextMessages - system.length));
            const removed = messages.length - system.length - tail.length;
            messages.splice(0, messages.length, ...system, ...tail);
            if (removed > 0)
                emit({ type: "info", text: `Contesto compattato: ${removed} messaggi rimossi` });
        }
        const streamOpts = {
            model: options.model,
            apiKey: options.apiKey,
            baseUrl: options.baseUrl,
            format: options.fallbackToolCalling ? "json" : "auto",
            signal,
        };
        let text = "";
        let calls = [];
        let final;
        try {
            for await (const event of provider.stream(messages, tools.map(toolSpec), streamOpts)) {
                if (signal?.aborted) {
                    interrupted = true;
                    break;
                }
                if (event.type === "delta") {
                    text += event.text;
                    emit({ type: "text", text: event.text });
                }
                else if (event.type === "tool_call") {
                    calls.push(event.call);
                }
                else if (event.type === "usage") {
                    usage.inputTokens += event.inputTokens;
                    usage.outputTokens += event.outputTokens;
                    usage.costUsd += event.costUsd ?? 0;
                    emit({ type: "usage", ...usage });
                }
                else if (event.type === "done") {
                    // fine stream
                }
            }
        }
        catch (error) {
            if (signal?.aborted)
                interrupted = true;
            else
                emit({ type: "error", text: error.message });
            break;
        }
        if (interrupted)
            break;
        if (options.fallbackToolCalling && calls.length === 0) {
            const envelope = parseToolEnvelope(text);
            calls = envelope.calls;
            final = envelope.final;
            if (calls.length > 0)
                emit({ type: "info", text: "Protocollo di fallback attivato" });
        }
        if (calls.length === 0) {
            messages.push({ role: "assistant", content: final ?? text });
            break;
        }
        messages.push({ role: "assistant", content: text, toolCalls: calls });
        for (const call of calls) {
            if (signal?.aborted) {
                interrupted = true;
                break;
            }
            const tool = tools.find((item) => item.name === call.name);
            if (!tool) {
                messages.push({
                    role: "tool",
                    name: call.name,
                    toolCallId: call.id,
                    content: redact(`Tool sconosciuto: ${call.name}`),
                });
                continue;
            }
            emit({ type: "tool", status: "start", name: tool.name, detail: JSON.stringify(call.arguments) });
            let result;
            const parsed = tool.parse(call.arguments);
            if (!parsed.ok) {
                result = `Argomenti non validi: ${parsed.error}`;
                emit({ type: "tool", status: "end", name: tool.name, ok: false, detail: result });
            }
            else {
                const request = {
                    tool: tool.name,
                    args: parsed.value,
                    preview: JSON.stringify(parsed.value, null, 2),
                };
                const decision = decide(policy, request);
                const granted = decision === "allow" || (decision === "ask" && (await ask(request)));
                if (!granted) {
                    result = "Operazione negata dall'utente";
                    emit({ type: "tool", status: "end", name: tool.name, ok: false, detail: result });
                }
                else {
                    const ctx = {
                        cwd: options.cwd,
                        emit: (line) => emit({ type: "info", text: line }),
                        signal,
                    };
                    try {
                        result = await tool.run(parsed.value, ctx);
                        emit({ type: "tool", status: "end", name: tool.name, ok: true });
                    }
                    catch (error) {
                        result = `Errore: ${error.message}`;
                        emit({ type: "tool", status: "end", name: tool.name, ok: false, detail: result });
                    }
                }
            }
            const safeResult = redact(result).slice(0, 20000);
            messages.push({ role: "tool", name: call.name, toolCallId: call.id, content: safeResult });
        }
    }
    emit({ type: "done" });
    return { messages, usage, steps, interrupted };
}
//# sourceMappingURL=loop.js.map