# Pubblicazione di Xevion

## Stato attuale

- Repo pubblico: https://github.com/The-Light10/xevion
- Release: https://github.com/The-Light10/xevion/releases/tag/v0.1.1
- Nome npm: `xevion` (account npm `the_ligh10`, indipendente dal nome GitHub).
- Canale di distribuzione: **solo npm** (`npm install -g xevion`).
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

La cartella `dist/` è committata: serve per installare il pacchetto da git e per la provenance.

## 2. Token npm

Il workflow richiede un **granular access token** con:

- packages e scopes: **Read and write (publish and stage)** (NON "stage only");
- package selezionato: `xevion`;
- **Bypass 2FA** abilitato, perché CI non può rispondere a una challenge 2FA.

Salva il token come secret:

```bash
gh secret set NPM_TOKEN -R The-Light10/xevion
```

## 3. Pubblicazione

`.github/workflows/publish.yml` si attiva su una GitHub Release `published` (oppure con `workflow_dispatch`). Esegue typecheck, test, build e poi:

```bash
npm publish --access public --provenance
```

Lo staging richiede npm >= 11.15.0 e Node >= 22.14.0: il workflow installa npm@latest su Node 22. `--provenance` richiede il repository pubblico.

### Via locale (alternativa)

```bash
npm login
npm publish --access public
```

`prepublishOnly` esegue comunque typecheck, test e build prima del publish.

## 4. Verifica finale

```bash
npm view xevion version
npm install -g xevion
xevion --version
```

## Aggiornamenti futuri

1. Aggiorna `version` in `package.json` e `package-lock.json` con `npm version X.Y.Z --no-git-tag-version`.
2. Esegui `npm run build` per aggiornare la `dist/` committata.
3. Commit e push.
4. Nuova Release con tag `vX.Y.Z` → publish automatico.

Il workflow CI continua a girare su ogni push e pull request, indipendentemente dal publish.
