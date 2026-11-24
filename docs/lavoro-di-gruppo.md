# Lavoro di Gruppo — Registro Contributi, Branch, PR e Coding Agent

Questo file tiene traccia in tempo reale di **chi ha fatto cosa**, dei **branch e Pull Request principali** e degli **strumenti/coding agent usati** da ciascun membro.  
Verrà utilizzato come fonte diretta per compilare le sezioni **7 (Sviluppo con i coding agent)** e **8 (Lavoro di gruppo)** del `README.md` finale.

> **Regola anti-conflitti:** ad ogni PR, ogni membro aggiorna **solo la propria sottosezione** qui sotto (e la riga relativa al proprio branch nella tabella, se necessario).

---

## 1. Branch e Pull Request principali

| PR | Branch | Autore | Reviewers | Stato | Descrizione sintetica |
|---|---|---|---|---|---|
| PR #1 | `chore/project-setup` | Gabriele (`Fariguu`) | Marco, Jennifer | Aperta / In review | Setup iniziale Express + SQLite, schema DB, `.gitignore`, `.env.example`, `decisioni.md`, `AGENTS.md`, shell frontend |
| PR #2 | `feat/data-ingestion-admin` | Marco (`DarkFury17`) | Gabriele, Jennifer | In preparazione | Dataset ufficiali Puglia, seed DB, upload CSV/JSON Admin e pannello moderazione segnalazioni |
| PR #3 | `feat/auth-and-reports` | Gabriele (`Fariguu`) | Marco, Jennifer | In preparazione | Autenticazione RBAC (`cittadino`/`admin`), utenti di prova inventati, CRUD segnalazioni e test API |
| PR #4 | `feat/search-map-ui` | Jennifer (`jenniferdibenedetto`) | Gabriele, Marco | Pronta per review | Ricerca farmaci e matching equivalenti AIFA, inquadramento Comune → ASL/Distretto, mappa Leaflet/Nominatim e UI |
| PR #5 | `fix/integration-polish` | Gruppo | Tutti | In preparazione | Integrazione finale, fix post-merge e verifica end-to-end |
| PR #6 | `docs/readme-and-screenshots` | Gruppo | Tutti | In preparazione | Screenshot finali e stesura completa del `README.md` di consegna |

---

## 2. Contributi per membro

### Farigu Gabriele Vitocosmo (`Fariguu`)
- **Branch principali:** `chore/project-setup`, `feat/auth-and-reports`
- **Attività svolte:**
  - Setup architetturale del repository (`package.json`, `.gitignore`, `.env.example`, `src/app.js`, `src/server.js`, `src/db/schema.sql`, `src/db/database.js`, `src/middleware/auth.js`, shell `public/`).
  - Redazione di `decisioni.md`, `AGENTS.md` e `docs/lavoro-di-gruppo.md`.
  - *(Da aggiornare durante `feat/auth-and-reports`: auth RBAC, CRUD segnalazioni, test API)*
- **Coding agent, modelli, approccio e skill usati:**
  - **Agent & Modello:** Antigravity (Gemini)
  - **Approccio:** Planning guidato con domande preliminari + esecuzione passo-passo verificata con test
  - **Skill usate:** *(da annotare eventuali skill utilizzate)*

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
