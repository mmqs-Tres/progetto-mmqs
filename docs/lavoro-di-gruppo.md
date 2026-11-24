# Lavoro di Gruppo — Registro Contributi, Branch, PR e Coding Agent

Questo file tiene traccia in tempo reale di **chi ha fatto cosa**, dei **branch e Pull Request principali** e degli **strumenti/coding agent usati** da ciascun membro.  
Verrà utilizzato come fonte diretta per compilare le sezioni **7 (Sviluppo con i coding agent)** e **8 (Lavoro di gruppo)** del `README.md` finale.

> **Regola anti-conflitti:** ad ogni PR, ogni membro aggiorna **solo la propria sottosezione** qui sotto (e la riga relativa al proprio branch nella tabella, se necessario).

---

## 1. Branch e Pull Request principali

| PR | Branch | Autore | Reviewers | Stato | Descrizione sintetica |
|---|---|---|---|---|---|
| PR #4 | `chore/project-setup` | Gabriele (`Fariguu`) | Marco, Jennifer | Mergiata (approvata da Jennifer) | Setup iniziale Express + SQLite, schema DB, `.gitignore`, `.env.example`, `decisioni.md`, `AGENTS.md`, shell frontend |
| PR #2 | `feat/data-ingestion-admin` | Marco (`DarkFury17`) | Gabriele, Jennifer | In preparazione | Dataset ufficiali Puglia, seed DB, upload CSV/JSON Admin e pannello moderazione segnalazioni |
| *(da aprire)* | `feat/auth-and-reports` | Gabriele (`Fariguu`) | Marco, Jennifer | Sviluppo completato, PR da aprire | Autenticazione RBAC (`cittadino`/`admin`), CRUD segnalazioni con interfaccia e test API |
| PR #4 | `feat/search-map-ui` | Jennifer (`jenniferdibenedetto`) | Gabriele, Marco | In preparazione | Ricerca farmaci e matching equivalenti AIFA, inquadramento Comune → ASL/Distretto, mappa Leaflet/Nominatim e UI |
| PR #5 | `fix/integration-polish` | Gruppo | Tutti | In preparazione | Integrazione finale, fix post-merge e verifica end-to-end |
| PR #6 | `docs/readme-and-screenshots` | Gruppo | Tutti | In preparazione | Screenshot finali e stesura completa del `README.md` di consegna |

---

## 2. Contributi per membro

### Farigu Gabriele Vitocosmo (`Fariguu`)
- **Branch principali:** `chore/project-setup`, `feat/auth-and-reports`
- **Attività svolte:**
  - Setup architetturale del repository (`package.json`, `.gitignore`, `.env.example`, `src/app.js`, `src/server.js`, `src/db/schema.sql`, `src/db/database.js`, `src/middleware/auth.js`, shell `public/`).
  - Redazione di `decisioni.md`, `AGENTS.md` e `docs/lavoro-di-gruppo.md`.
  - Autenticazione JWT (`register`, `login`, `me`) con ruolo letto dal DB a ogni richiesta e `JWT_SECRET` obbligatorio (minimo 32 caratteri).
  - CRUD segnalazioni con permessi, ritorno in moderazione dopo la modifica e nessun dato dell'autore nelle risposte.
  - Interfaccia di accesso e segnalazioni (`public/js/reports-auth.js`), con evento `pharma:auth` per gli altri moduli.
  - 28 test API e verifica manuale nel browser.
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** Antigravity (Gemini) per `chore/project-setup`; Claude Code (Claude Opus 5.5) per `feat/auth-and-reports`
  - **Approccio:** Planning guidato con domande preliminari + esecuzione passo-passo verificata con test (`chore/project-setup`); Plan Mode con analisi delle falle e piano approvato prima dello sviluppo (`feat/auth-and-reports`)
  - **Skill usate:** `built-in-browser` (inclusa in Claude Code desktop, di Anthropic) per la verifica nel browser di `feat/auth-and-reports`; *(da annotare eventuali skill usate in `chore/project-setup`)*

---

### Di Palma Marco (`DarkFury17`)
- **Branch principali:** `feat/data-ingestion-admin`
- **Attività svolte:**
  - *(Da compilare durante lo sviluppo: dataset Min. Salute / AIFA / Regione Puglia, `data/seed.js`, endpoint e UI Admin upload CSV/JSON + moderazione)*
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** *(da compilare)*
  - **Approccio:** *(es. Plan Mode / Full Auto / ecc.)*
  - **Skill usate:** *(da compilare, indicando anche da dove vengono)*

---

### Dibenedetto Jennifer (`jenniferdibenedetto`)
- **Branch principali:** `feat/search-map-ui`
- **Attività svolte:**
  - *(Da compilare durante lo sviluppo: ricerca farmaci + equivalenti AIFA, distretti ASL per Comune, mappa interattiva Leaflet + Nominatim, layout UI)*
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** *(da compilare)*
  - **Approccio:** *(es. Plan Mode / Full Auto / ecc.)*
  - **Skill usate:** *(da compilare, indicando anche da dove vengono)*
