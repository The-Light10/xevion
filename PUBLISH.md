# Pubblicazione di Xevion

Lo scaffolding è pronto. Manca solo un **account npm**: hai GitHub, ma npm serve per
`npm publish`. Una volta creato, la pubblicazione è questione di minuti.

## Stato attuale

- Nome npm `xevion`: verificato libero al momento del rename.
- Canale di distribuzione scelto: **solo npm** (`npm install -g xevion`).
- CI: Ubuntu, macOS, Windows × Node 20/22 (`.github/workflows/ci.yml`).
- Release: `.github/workflows/publish.yml` pubblica automaticamente quando crei una GitHub Release.
- Nessuna telemetria: la rete resta solo verso il provider scelto o download espliciti.

## 1. Controlli locali

```bash
cd xevion
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
npm publish --dry-run
```

## 2. Account npm

1. Crea l'account su https://www.npmjs.com/signup e verifica la email.
2. Vai su *Access Tokens* → *Generate New Token* → **Classic** → scopo **Automation**.
3. Copia il token: serve al passo 4.

## 3. Repository GitHub

L'account `the-light10` esiste, il repo `xevion` non è ancora stato creato.

1. Crealo su https://github.com/new con nome **`xevion`**, **vuoto** (nessun README,
   LICENSE o .gitignore: li abbiamo già) e **Public** — serve per `--provenance`.
2. Il repo locale è già inizializzato su `main` con remote
   `https://github.com/the-light10/xevion.git`.

```bash
cd xevion
git config user.name "Il Tuo Nome"
git config user.email "la.tua@email.it"
git add .
git commit -m "Initial release of Xevion"
git push -u origin main
```

`package.json` contiene già `repository`, `homepage` e `bugs` con il tuo URL.

## 4. Secret del token

Nel repo GitHub: **Settings → Secrets and variables → Actions → New repository secret**

- Name: `NPM_TOKEN`
- Value: il token del passo 2

## 5. Pubblicazione

### Via GitHub (consigliata)

Crea una Release con tag `v0.1.0`. Il workflow esegue typecheck, test, build e
`npm publish --access public --provenance`.

> `--provenance` richiede repository pubblico. Se il repo è privato, rimuovi il flag.

### Via locale

```bash
npm login
npm publish --access public
```

`prepublishOnly` esegue comunque typecheck, test e build prima del publish.

## 6. Verifica finale

```bash
npm view xevion version
npm install -g xevion
xevion --version
```

## Aggiornamenti futuri

1. Aggiorna `version` in `package.json`.
2. Commit e push.
3. Nuova Release con tag `vX.Y.Z` → publish automatico.

Il workflow CI continua a girare su ogni push e pull request, indipendentemente dal publish.
