import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { configExists, loadConfig } from "../config/load.js";
import { globalConfigPath } from "../config/paths.js";
import { configSchema, type XevionConfig } from "../config/schema.js";
import { detectHardware } from "../local/hardware.js";

async function question(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(prompt)).trim();
  } finally {
    rl.close();
  }
}

export async function ensureFirstRun(cwd: string): Promise<XevionConfig> {
  if (configExists()) return loadConfig(cwd);

  console.log("Primo avvio di xevion. Scegli come usare il modello:");
  console.log("  1) Locale — gratis, offline, nessuna chiave");
  console.log("  2) Cloud — con chiave API personale");
  const choice = await question("Scelta [1]: ");

  let values: Record<string, unknown>;
  if (choice === "2") {
    console.log("Provider cloud disponibili ora: endpoint compatibile (OpenAI, OpenRouter, Groq, LM Studio, vLLM).");
    const provider = (await question("Provider [openai-compatible]: ")) || "openai-compatible";
    const baseUrl = await question("Base URL (Invio per default): ");
    const apiKeyEnv = (await question("Nome variabile d'ambiente della chiave [OPENAI_API_KEY]: ")) || "OPENAI_API_KEY";
    const model = (await question("Modello [gpt-4o-mini]: ")) || "gpt-4o-mini";
    values = {
      provider: provider === "openai-compatible" ? "openai-compatible" : "openai-compatible",
      baseUrl: baseUrl || undefined,
      apiKeyEnv,
      model,
      defaultPermission: "ask",
    };
    console.log(`La chiave NON viene salvata: esporta ${apiKeyEnv} nel tuo shell prima di usare xevion.`);
  } else {
    const hardware = detectHardware();
    console.log(`Hardware: ${hardware.platform}/${hardware.arch} · ${hardware.ramGb} GB RAM · ${hardware.cores} core`);
    console.log(hardware.note);
    const model = (await question(`Modello consigliato [${hardware.suggestedModel}]: `)) || hardware.suggestedModel;
    values = { provider: "ollama", model, defaultPermission: "ask" };
    console.log("Assicurati che il runtime locale sia attivo, poi xevion lo usera' senza chiamate a servizi esterni.");
  }

  const config = configSchema.parse(values);
  const path = globalConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Configurazione salvata in ${path}`);
  return config;
}
