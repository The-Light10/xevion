# Xevion

Agente di coding autonomo da terminale. Locale e gratuito per default, cloud solo se lo scegli tu.

## Perché

- Nessuna telemetria, nessun servizio di mediazione.
- Nessuna rete se non verso il provider selezionato o per download espliciti di runtime/modelli.
- Funziona offline con un modello locale.
- Le chiavi API non vengono mai salvate nei file di configurazione: si leggono da variabili d'ambiente (il keychain di sistema arriva nella fase 3).
- Cross-platform: macOS, Linux, Windows.

## Installazione

Richiede Node.js 20 o superiore.

```bash
npm install -g xevion
xevion
```

Al primo avvio parte un wizard: scegli **locale (gratis)** oppure **cloud (con chiave)**.

## Uso

```bash
xevion                        # sessione interattiva
xevion run "aggiungi test al parser"   # task singolo, non interattivo
xevion sessions               # sessioni salvate
```

Opzioni principali: `--model`, `--provider`, `--base-url`, `--api-key-env`, `--session`, `--fallback`, `--ascii`, `--yes`.

Comandi in sessione: `/new /sessions /model /connect /models /cost /undo /compact /help /quit`.

## Provider supportati in questa versione

- **Locale**: Ollama (`http://127.0.0.1:11434` di default).
- **Cloud**: qualsiasi endpoint compatibile con l'API chat di OpenAI (OpenAI, OpenRouter, Groq, LM Studio, vLLM...).

I provider aggiuntivi e l'integrazione con il keychain di sistema sono previsti nelle fasi successive.

## Configurazione

- Globale: `~/.config/xevion/xevion.json` (Linux), `~/Library/Application Support/xevion/xevion.json` (macOS), `%APPDATA%\xevion\xevion.json` (Windows).
- Di progetto: `xevion.json` nella root del repository.
- Istruzioni del progetto: `AGENTS.md` nella root.

La configurazione non contiene chiavi API: il campo `apiKeyEnv` indica solo il nome della variabile d'ambiente da leggere.

## Sicurezza

- I comandi e le modifiche ai file chiedono conferma per default (`allow` / `ask` / `deny` per tool e pattern di comando).
- I percorsi sono limitati alla root del progetto salvo esplicita autorizzazione.
- Segreti e chiavi vengono redatti da log e messaggi inviati al modello.
- Contenuto di file, output di comandi e pagine web sono trattati come dati non fidati.

## Sviluppo

```bash
npm ci
npm run typecheck
npm test
npm run build
```

La CI copre Ubuntu, macOS e Windows con Node 20 e 22.

## Licenza

MIT
