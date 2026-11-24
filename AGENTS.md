# AGENTS.md — Istruzioni per i Coding Agent

Questo file fornisce il contesto operativo ai coding agent che lavorano sul repository **PharmaPuglia OpenCare**.

## 1. Obiettivo del progetto
MVP web per il tema **Salute e Territorio (Regione Puglia)** con 3 funzionalità core:
1. Ricerca farmaci e matching equivalenti (AIFA) + inquadramento Comune → ASL/Distretto (Open Data Puglia) + mappa interattiva farmacie/parafarmacie (Min. Salute + Leaflet/Nominatim).
2. Autenticazione RBAC (`cittadino`, `admin`) e CRUD completo delle segnalazioni utente sulla disponibilità/turni/disservizi.
3. Dashboard Admin per upload dataset (CSV/JSON) con validazione e moderazione delle segnalazioni.

## 2. Documento di riferimento
Prima di modificare o creare file, leggi sempre [`decisioni.md`](./decisioni.md) per:
- palette colori, tipografia e linee guida UI;
- schema SQLite (`src/db/schema.sql`);
- contratti API REST;
- separazione dei file tra i branch.

## 3. Regole obbligatorie
- **Stack:** Node.js (CommonJS) + Express + SQLite (`better-sqlite3`) + HTML/CSS/JS vanilla in `public/`. Non introdurre framework frontend o bundler non concordati.
- **Database:** usare sempre query parametrizzate con `src/db/database.js`. Non committare mai file `*.db` o `*.sqlite`.
- **Sicurezza e segreti:** mai hardcodare password, API key o `JWT_SECRET`. Leggere sempre da `process.env` e documentare eventuali nuove chiavi in `.env.example` (senza valori reali).
- **Dati di prova:** usare solo dati e utenti inventati (es. dominio `.test`), mai dati personali reali.
- **Perimetro del branch:** modificare solo i file assegnati al proprio branch come indicato in `decisioni.md` per evitare conflitti di merge.
- **Tracciamento lavoro di gruppo:** prima di aprire ogni PR, aggiornare la propria sottosezione in `docs/lavoro-di-gruppo.md` (attività svolte, PR, agent/modelli/approccio/skill usati) senza modificare le sezioni degli altri membri.
- **Workflow PR:** non fare mai push diretto su `main`; lavorare sempre su branch dedicati e aprire una PR richiedendo review agli altri membri.

## 4. Comandi utili
- Avvio sviluppo: `npm run dev`
- Avvio produzione: `npm start`
- Seed database: `npm run seed`
- Test automatici: `npm test`
