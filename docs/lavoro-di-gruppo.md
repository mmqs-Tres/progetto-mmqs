# Lavoro di Gruppo — Registro Contributi, Branch, PR e Coding Agent

Questo file tiene traccia in tempo reale di **chi ha fatto cosa**, dei **branch e Pull Request principali** e degli **strumenti/coding agent usati** da ciascun membro.  
Verrà utilizzato come fonte diretta per compilare le sezioni **7 (Sviluppo con i coding agent)** e **8 (Lavoro di gruppo)** del `README.md` finale.

> **Regola anti-conflitti:** ad ogni PR, ogni membro aggiorna **solo la propria sottosezione** qui sotto (e la riga relativa al proprio branch nella tabella, se necessario).

---

## 1. Branch e Pull Request principali

| PR | Branch | Autore | Reviewers | Stato | Descrizione sintetica |
|---|---|---|---|---|---|
| PR #4 | `chore/project-setup` | Gabriele (`Fariguu`) | Marco, Jennifer | Mergiata (approvata da Jennifer) | Setup iniziale Express + SQLite, schema DB, `.gitignore`, `.env.example`, `decisioni.md`, `AGENTS.md`, shell frontend |
| PR #5 | `feat/auth-and-reports` | Gabriele (`Fariguu`) | Marco, Jennifer | Mergiata | Autenticazione RBAC (`cittadino`/`admin`), CRUD segnalazioni con interfaccia e test API |
| PR #6 | `feat/search-map-ui` | Jennifer (`jenniferdibenedetto`) | Gabriele, Marco | Mergiata | Ricerca farmaci e matching equivalenti AIFA, inquadramento Comune → ASL/Distretto, mappa Leaflet/Nominatim e UI |
| PR #7 | `feat/data-ingestion-admin` | Marco (`DarkFury17`) | Gabriele, Jennifer | Mergiata | Dataset ufficiali Puglia, seed DB, upload CSV/JSON Admin e pannello moderazione segnalazioni |
| *(da aprire)* | `fix/integration-polish` | Gruppo | Tutti | In sviluppo | Integrazione finale, fix post-merge e verifica end-to-end |
| *(da aprire)* | `docs/readme-and-screenshots` | Gruppo | Tutti | In preparazione | Screenshot finali e stesura completa del `README.md` di consegna |

---

## 2. Contributi per membro

### Farigu Gabriele Vitocosmo (`Fariguu`)
- **Branch principali:** `chore/project-setup`, `feat/auth-and-reports`, `fix/integration-polish`
- **Attività svolte:**
  - Setup architetturale del repository (`package.json`, `.gitignore`, `.env.example`, `src/app.js`, `src/server.js`, `src/db/schema.sql`, `src/db/database.js`, `src/middleware/auth.js`, shell `public/`).
  - Redazione di `decisioni.md`, `AGENTS.md` e `docs/lavoro-di-gruppo.md`.
  - Autenticazione JWT (`register`, `login`, `me`) con ruolo letto dal DB a ogni richiesta e `JWT_SECRET` obbligatorio (minimo 32 caratteri).
  - CRUD segnalazioni con permessi, ritorno in moderazione dopo la modifica e nessun dato dell'autore nelle risposte.
  - Interfaccia di accesso e segnalazioni (`public/js/reports-auth.js`), con evento `pharma:auth` per gli altri moduli.
  - 28 test API e verifica manuale nel browser.
  - Aggiornamento di `decisioni.md`, `AGENTS.md` e `.env.example` con le regole su autenticazione e segnalazioni.
  - Integrazione (`fix/integration-polish`): stile uniforme di form e Area Admin, layout responsive, schede farmaco e mappa utilizzabili con i dati reali.
  - Correzioni (`fix/integration-polish`): login unico, password di prova spostate in `.env`, rimozione dei dati d'esempio, ricerca senza accenti, CSP, messaggi di errore e 16 test di integrazione.
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** Antigravity (Gemini) per `chore/project-setup`; Claude Code (Claude Opus 5.5) per `feat/auth-and-reports` e `fix/integration-polish`
  - **Approccio:** Planning guidato con domande preliminari + esecuzione passo-passo verificata con test (`chore/project-setup`); Plan Mode con analisi delle falle e piano approvato prima dello sviluppo (`feat/auth-and-reports`); verifica del `main` integrato, poi correzioni con test e prove nel browser (`fix/integration-polish`)
  - **Skill usate:** `built-in-browser` (inclusa in Claude Code desktop, di Anthropic) per la verifica nel browser di `feat/auth-and-reports` e `fix/integration-polish`; *(da annotare eventuali skill usate in `chore/project-setup`)*

---

### Di Palma Marco (`DarkFury17`)
- **Branch principali:** `feat/data-ingestion-admin`
- **Attività svolte:**
  - Estrazione e pulizia dei dataset ufficiali per la Regione Puglia dai dati aperti del Ministero della Salute e dell'AIFA: 1.308 farmacie attive, 628 parafarmacie attive, 257 comuni/distretti ASL pugliesi e 8.598 medicinali AIFA con suddivisione tra brand originator ed equivalenti generici in `data/raw/` (JSON e CSV campione).
  - Implementazione dello script di seed transazionale `data/seed.js` per SQLite con hashing password `bcryptjs`, creazione utenti inventati di prova (`admin@pharmapuglia.test`, `cittadino@pharmapuglia.test`), caricamento idempotente dei dataset e segnalazioni iniziali.
  - Implementazione router backend Admin in `src/routes/admin.routes.js`:
    - Protezione con middleware RBAC `requireAdmin`.
    - `POST /api/admin/upload/:dataset`: upload multi-formato CSV e JSON (via `multer` e `csv-parse`) per `pharmacies`, `medicines`, `districts`, con validazione e conteggio record (`inserted`, `updated`, `skipped`).
    - `GET /api/admin/reports`: listing completo con join su utenti e presidi e filtro opzionale `status`.
    - `PATCH /api/admin/reports/:id/status`: approvazione e rifiuto con validazione degli stati consentiti.
  - Sviluppo del frontend Admin in `public/js/admin.js` integrato nella tab `#tab-admin`:
    - Form reattivo per l'upload di dataset con visualizzazione immediata dell'esito.
    - Tabella di moderazione delle segnalazioni dei cittadini con filtro per stato e pulsanti contestuali di approvazione/rifiuto in tempo reale.
    - Card di accesso rapido per testare le funzionalità da utente amministratore.
  - Scrittura ed esecuzione dei test automatici completi per il modulo admin in `tests/admin.test.js` (RBAC, upload CSV/JSON, filtri e moderazione segnalazioni).
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** Antigravity (Gemini 3.8 Flash)
  - **Approccio:** Analisi preliminare dei dati grezzi ministeriali ed AIFA (ispezione encoding cp1252/latin1, delimitatori, normalizzazione coordinate), planning delle attività diviso in step, sviluppo modulare guidato da test automatici con `node:test` e `supertest`.
  - **Skill usate:** Nessuna skill proprietaria; uso delle capacità native dell'agent per orchestrazione del workspace, esecuzione comandi di test e refactoring mirato.

---

### Dibenedetto Jennifer (`jenniferdibenedetto`)
- **Branch principali:** `feat/search-map-ui`
- **Attività svolte:**
  - Implementazione degli endpoint REST in `src/routes/search.routes.js` con query SQLite parametrizzate (`?`) e dataset pugliese di riferimento auto-inizializzato (`ensureReferenceData`):
    - `GET /api/medicines`: ricerca farmaci AIFA per nome commerciale, principio attivo, codice AIC/ATC o titolare, con calcolo automatico dei farmaci equivalenti (stesso principio attivo ordinati per `price ASC`) e del risparmio potenziale.
    - `GET /api/districts`: inquadramento territoriale Comune → ASL e Distretto Socio-Sanitario della Regione Puglia con conteggio dei presidi afferenti.
    - `GET /api/pharmacies`: ricerca farmacie e parafarmacie con join sui distretti ASL, calcolo distanza geodetica (formula di Haversine), filtro per raggio in km e ordinamento per vicinanza.
    - `GET /api/geocode`: geocoding indirizzi e Comuni tramite OpenStreetMap Nominatim (`NOMINATIM_USER_AGENT`) con fallback locale sui Comuni e presidi pugliesi.
  - Progettazione e sviluppo della UI nella vista `Cerca & Mappa` (`public/index.html`, `public/css/style.css`) e della logica frontend (`public/js/search-map.js`) con mappa interattiva Leaflet, marker differenziati per farmacie/parafarmacie, cerchio del raggio di ricerca, geolocalizzazione GPS e link alle indicazioni stradali.
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** Antigravity (Gemini)
  - **Approccio:** Plan Mode (`/plan`) con analisi preliminare di `decisioni.md` e `AGENTS.md`, piano di implementazione strutturato, sviluppo modulare nel perimetro del branch `feat/search-map-ui` e verifica automatica degli endpoint API e dell'interfaccia.
  - **Skill usate:** Nessuna skill esterna aggiuntiva (utilizzo diretto delle linee guida e regole di repository definite in `AGENTS.md` e `decisioni.md`).
