#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { HELP, parseArgs } from "./args.js";
import { ensureFirstRun } from "./wizard.js";
import { configSchema } from "../config/schema.js";
import { globalConfigPath } from "../config/paths.js";
import { loadInstructions } from "../config/load.js";
import { writeFileSync } from "node:fs";
import { getProvider } from "../providers/factory.js";
import { findModel, listModels } from "../providers/registry.js";
import { SYSTEM_PROMPT } from "../providers/types.js";
import { FALLBACK_INSTRUCTIONS } from "../core/fallback.js";
import { runLoop } from "../core/loop.js";
import { allTools } from "../tools/index.js";
import { defaultPolicy } from "../permissions/policy.js";
import { Renderer } from "../tui/render.js";
import { appendMessages, createSession, exportMarkdown, listSessions, readSession } from "../sessions/store.js";
import { redact } from "../security/redact.js";
const VERSION = "0.1.0";
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === "help") {
        console.log(HELP);
        return 0;
    }
    if (args.command === "version") {
        console.log(`xevion ${VERSION}`);
        return 0;
    }
    if (args.command === "sessions") {
        for (const session of listSessions()) {
            console.log(`${session.id}  ${session.provider}/${session.model}  ${session.createdAt}`);
        }
        return 0;
    }
    const cwd = process.cwd();
    let config = await ensureFirstRun(cwd);
    if (args.model || args.provider || args.baseUrl || args.apiKeyEnv) {
        config = configSchema.parse({
            ...config,
            model: args.model ?? config.model,
            provider: args.provider ?? config.provider,
            baseUrl: args.baseUrl ?? config.baseUrl,
            apiKeyEnv: args.apiKeyEnv ?? config.apiKeyEnv,
        });
    }
    const renderer = new Renderer(args.ascii || config.asciiOnly);
    const local = config.provider === "ollama";
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
    const fallback = args.fallback || !(findModel(config.model)?.toolCalling ?? true);
    const provider = getProvider(config.provider);
    const instructions = [
        SYSTEM_PROMPT,
        fallback ? FALLBACK_INSTRUCTIONS : "",
        loadInstructions(cwd) ? `Istruzioni del progetto:\n${loadInstructions(cwd)}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    const session = args.session && readSession(args.session).meta ? readSession(args.session).meta : createSession({ cwd, model: config.model, provider: config.provider });
    const existing = readSession(session.id).messages;
    let messages = existing.length > 0 ? existing : [{ role: "system", content: instructions }];
    const history = [];
    const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const emit = (event) => {
        if (event.type === "usage") {
            usage.inputTokens = event.inputTokens;
            usage.outputTokens = event.outputTokens;
            usage.costUsd = event.costUsd;
        }
        const line = renderer.event(event);
        if (line)
            process.stdout.write(line);
    };
    const ask = async (request) => {
        if (args.yes)
            return true;
        const preview = redact(request.preview ?? JSON.stringify(request.args));
        console.log(`\n${renderer.header(config.model, config.provider, local, usage.costUsd)}`);
        console.log(`Consentire ${request.tool}?\n${renderer.diff(preview)}\n`);
        const answer = (await rl.question("Consenti? [y/N]: ")).trim().toLowerCase();
        return answer === "y" || answer === "s";
    };
    const execute = async (prompt) => {
        if (!prompt.trim())
            return;
        history.push([...messages]);
        const before = messages.length;
        messages = [...messages, { role: "user", content: prompt.trim() }];
        const result = await runLoop({
            provider,
            cwd,
            messages,
            tools: allTools,
            policy: defaultPolicy(),
            model: config.model,
            apiKey,
            baseUrl: config.baseUrl,
            maxSteps: config.maxSteps,
            contextMessages: config.contextMessages,
            fallbackToolCalling: fallback,
            ask,
            emit,
        });
        messages = result.messages;
        appendMessages(session.id, messages.slice(before));
        if (result.interrupted)
            console.log("\nInterrotto.");
    };
    console.log(renderer.header(config.model, config.provider, local, usage.costUsd));
    console.log(`Sessione ${session.id} · /help per i comandi`);
    if (args.command === "run") {
        if (!args.prompt) {
            console.error("Uso: xevion run \"prompt\"");
            rl.close();
            return 1;
        }
        await execute(args.prompt);
        rl.close();
        return 0;
    }
    for (;;) {
        const input = (await rl.question("\nxevion> ")).trim();
        if (!input)
            continue;
        if (input === "/quit" || input === "/exit")
            break;
        if (input === "/help") {
            console.log(HELP);
            continue;
        }
        if (input === "/models") {
            for (const model of listModels()) {
                console.log(`${model.id.padEnd(30)} ${model.local ? "[locale · gratis]" : "[cloud]"} ctx=${model.context} tools=${model.toolCalling ? "si" : "no"}`);
            }
            continue;
        }
        if (input === "/sessions") {
            for (const item of listSessions())
                console.log(`${item.id}  ${item.provider}/${item.model}  ${item.createdAt}`);
            continue;
        }
        if (input === "/cost") {
            console.log(`Token ${usage.inputTokens}/${usage.outputTokens} · costo stimato $${usage.costUsd.toFixed(4)}`);
            continue;
        }
        if (input.startsWith("/model ")) {
            config = configSchema.parse({ ...config, model: input.slice(7).trim() });
            console.log(`Modello: ${config.model}`);
            continue;
        }
        if (input === "/undo") {
            const previous = history.pop();
            if (previous) {
                messages = previous;
                console.log("Ultimo turno annullato.");
            }
            else
                console.log("Niente da annullare.");
            continue;
        }
        if (input === "/compact") {
            messages = [messages[0], ...messages.slice(-20)];
            console.log("Contesto compattato.");
            continue;
        }
        if (input === "/new") {
            history.length = 0;
            messages = [{ role: "system", content: instructions }];
            console.log("Nuova conversazione.");
            continue;
        }
        if (input === "/connect") {
            console.log(`Config: ${globalConfigPath()}. Modifica il file o usa --provider/--model.`);
            continue;
        }
        if (input === "/export") {
            const path = `${session.id}.md`;
            writeFileSync(path, exportMarkdown(session.id), "utf8");
            console.log(`Esportato in ${path}`);
            continue;
        }
        if (input.startsWith("/")) {
            console.log("Comando sconosciuto. /help per la lista.");
            continue;
        }
        await execute(input);
    }
    rl.close();
    return 0;
}
main()
    .then((code) => process.exit(code))
    .catch((error) => {
    console.error(redact(`xevion: ${error.message}`));
    process.exit(1);
});
//# sourceMappingURL=index.js.map