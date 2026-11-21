export function parseArgs(argv) {
    const result = {
        command: "interactive",
        ascii: false,
        yes: false,
        fallback: false,
    };
    const promptParts = [];
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--help" || arg === "-h")
            result.command = "help";
        else if (arg === "--version" || arg === "-v")
            result.command = "version";
        else if (arg === "--ascii")
            result.ascii = true;
        else if (arg === "--yes" || arg === "-y")
            result.yes = true;
        else if (arg === "--fallback")
            result.fallback = true;
        else if (arg === "--model" || arg === "-m")
            result.model = argv[++i];
        else if (arg === "--provider")
            result.provider = argv[++i];
        else if (arg === "--base-url")
            result.baseUrl = argv[++i];
        else if (arg === "--session")
            result.session = argv[++i];
        else if (arg === "--api-key-env")
            result.apiKeyEnv = argv[++i];
        else if (arg === "run")
            result.command = "run";
        else if (arg === "sessions")
            result.command = "sessions";
        else if (!arg.startsWith("-"))
            promptParts.push(arg);
    }
    result.prompt = promptParts.join(" ") || undefined;
    return result;
}
export const HELP = `xevion - agente di coding da terminale

Uso:
  xevion                       avvia la sessione interattiva
  xevion run "prompt"          esegue un task e termina
  xevion sessions              elenca le sessioni salvate

Opzioni:
  -m, --model MODELLO        sovrascrive il modello configurato
      --provider ID          ollama | openai-compatible
      --base-url URL         endpoint del provider
      --api-key-env NOME     variabile d'ambiente con la chiave
      --session ID           riprende una sessione
      --fallback             forza il protocollo tool-call JSON
      --ascii                interfaccia solo ASCII
  -y, --yes                  accetta automaticamente i permessi
  -h, --help                 questa guida
  -v, --version              versione

Comandi in sessione:
  /new /sessions /model /connect /models /cost /undo /compact /help /quit`;
//# sourceMappingURL=args.js.map