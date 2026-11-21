# Pubblicazione di Xevion

## Stato attuale

- Repo pubblico: https://github.com/The-Light10/xevion
- Release: https://github.com/The-Light10/xevion/releases/tag/v0.1.0
- Nome npm `xevion`: libero al momento del rename.
- Canale di distribuzione scelto: **solo npm** (`npm install -g xevion`).
- CI: Ubuntu, macOS, Windows × Node 20/22 (`.github/workflows/ci.yml`).
- Nessuna telemetria: la rete resta solo verso il provider scelto o download espliciti.

## 1. Controlli locali

```bash
cd xevion
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## 2. Account npm e token

1. Account npm: https://www.npmjs.com/ (il nome utente può differire da GitHub).
2. Verifica l'indirizzo email.
3. Abilita la 2FA: serve per approvare le versioni staged.
4. Crea un *granular access token* con accesso in scrittura al package `xevion`.
   I token stage-only funzionano: il workflow usa `npm stage publish`.
5. Salva il token come secret `NPM_TOKEN`:

```bash
gh secret set NPM_TOKEN -R The-Light10/xevion
```

## 3. Pubblicazione

Il workflow `.github/workflows/publish.yml` si attiva su una GitHub Release `published`
(oppure con `workflow_dispatch`). Esegue typecheck, test, build e poi:

```bash
npm stage publish --access public --provenance
```

Lo staging richiede npm >= 11.15.0 e Node >= 22.14.0: il workflow installa npm@latest
su Node 22. `--provenance` richiede il repo pubblico.

La prima versione di un package nuovo crea un placeholder pubblico `0.0.0-stage`.
Il codice della versione 0.1.0 diventa installabile solo dopo l'approvazione con 2FA.
Se il token non è stage-only ma diretto, il workflow può usare `npm publish`.

### Approvare la versione staged

```bash
npm stage list xevion
npm stage view <stage-id>
npm stage download <stage-id>   # ispezione opzionale del tarball
npm stage approve <stage-id>    # richiede 2FA
```

Oppure approva da browser: npmjs.com → **Staged Packages** → Approve.

### Via locale (alternativa)

```bash
npm install -g npm@latest
npm login
npm stage publish --access public
npm stage list xevion
npm stage approve <stage-id>
```

## 4. Verifica finale

```bash
npm view xevion version
npm install -g xevion
xevion --version
```

## Aggiornamenti futuri

1. Aggiorna `version` in `package.json`.
2. Aggiorna `dist/` con `npm run build` (è committata per supportare l'installazione da git).
3. Commit e push.
4. Nuova Release con tag `vX.Y.Z` → staging, poi approvazione con 2FA.

Il workflow CI continua a girare su ogni push e pull request, indipendentemente dal publish.
