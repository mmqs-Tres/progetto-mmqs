# Decisioni di Progetto — PharmaPuglia OpenCare

Questo documento raccoglie tutte le decisioni condivise di **architettura, struttura, stile, design e workflow Git** per lo sviluppo dell'MVP di **PharmaPuglia OpenCare**.

---

## 1. Stack tecnologico

| Livello | Scelta | Motivazione |
|---|---|---|
| **Runtime** | Node.js (>= 20, LTS) | Unico linguaggio tra backend e frontend, `node --watch` e `node --test` nativi |
| **Backend** | Express (`express`) | Leggero, standard, modulare con router separati per feature |
| **Database** | SQLite (`better-sqlite3`) | Database relazionale a zero configurazione per chiunque cloni e avvii il repo |
| **Autenticazione** | `bcryptjs` + `jsonwebtoken` (JWT) | RBAC pulito a 2 ruoli (`cittadino`, `admin`) + accesso `guest` in lettura |
| **Dataset & Upload** | `multer` + `csv-parse` | Ingestione CSV/JSON sia da seed iniziale (`data/raw/`) sia da upload Admin |
| **Frontend** | HTML5 + CSS3 + JS vanilla in `public/` | Nessun build step, integrazione immediata con Express |
| **Mappa & Geocoding** | Leaflet (CDN) + OpenStreetMap / Nominatim | Servizi pubblici gratuiti per mappa interattiva e calcolo distanze |
| **Test** | `node:test` + `supertest` | Test automatici leggeri sugli endpoint API |

---

## 2. Design System e linee guida di stile (UI)

L'interfaccia deve risultare **chiara, istituzionale, accessibile e orientata all'urgenza sanitaria** (nessun gradiente pesante, nessun effetto neon, alto contrasto).

### Palette colori (variabili CSS in `public/css/style.css`)

```css
:root {
  --bg-page: #f7f9f8;
  --bg-surface: #ffffff;
  --bg-subtle: #eef3f1;
  --border-color: #dce4e0;

  --text-primary: #16241f;
  --text-secondary: #4b6058;

  --primary: #0f766e;         /* Verde sanitario */
  --primary-hover: #115e59;
  --primary-soft: #ccfbf1;

  --accent: #1d4ed8;          /* Blu istituzionale ASL */
  --accent-soft: #dbeafe;

  --success: #15803d;         /* Approved / Generico */
  --success-soft: #dcfce7;
  --warning: #b45309;         /* Pending / Ricetta */
  --warning-soft: #fef3c7;
  --danger: #b91c1c;          /* Rejected / Disservizio */
  --danger-soft: #fee2e2;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
}
```

### Tipografia e layout
- **Font:** `"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (base `16px`, `line-height: 1.5`).
- **Navigazione:** Top bar sticky con logo `PharmaPuglia OpenCare`, 3 viste principali a tab:
  1. `Cerca & Mappa` (pubblica: ricerca farmaci + equivalenti, filtro Comune → ASL/Distretto, mappa Leaflet)
  2. `Segnalazioni` (pubblica in lettura delle segnalazioni `approved`; CRUD completo per `cittadino`/`admin` autenticati)
  3. `Area Admin` (visibile solo se autenticato con ruolo `admin`: upload CSV/JSON + moderazione segnalazioni)
- **Componenti:** Card bianche con bordo `1px solid var(--border-color)`, badge pill per ruoli/stati (`approved`, `pending`, `rejected`, `Generico`, `Ricetta`), tabelle e griglie responsive (`@media (max-width: 768px)`).
- **Accessibilità:** `<label>` esplicite su tutti gli input, stati `:focus-visible`, feedback chiari di caricamento/errore (`aria-live="polite"`).

---

## 3. Struttura del repository e proprietà dei file

Per evitare conflitti tra i 3 branch paralleli, ciascun membro lavora sui propri file dedicati:

```text
progetto-mmqs/
├── .env.example                 # Variabili d'ambiente (mai valori reali)
├── .gitignore                   # Esclude .env, *.db, .DS_Store, .claude/settings.local.json
├── AGENTS.md                    # Istruzioni per i coding agent
├── decisioni.md                 # Questo documento
├── package.json                 # Dipendenze e script npm
├── README.md                    # Documentazione finale (PR dedicata)
├── data/
│   ├── raw/                     # [Marco] Dataset puliti Puglia (CSV/JSON)
│   └── seed.js                  # [Marco] Import/seed iniziale nel DB SQLite
├── docs/screenshots/            # [PR finale] Screenshot per il README
├── progetto/idee/               # Proposte originali (non modificare)
├── src/
│   ├── app.js                   # Setup Express + mount dei router
│   ├── server.js                # Avvio server su PORT
│   ├── db/
│   │   ├── database.js          # Connessione SQLite + init schema
│   │   └── schema.sql           # Schema relazionale condiviso
│   ├── middleware/
│   │   └── auth.js              # [Gabriele] Middleware JWT e RBAC
│   └── routes/
│       ├── admin.routes.js      # [Marco] Upload CSV/JSON + moderazione
│       ├── auth.routes.js       # [Gabriele] Register, Login, /me
│       ├── reports.routes.js    # [Gabriele] CRUD segnalazioni
│       └── search.routes.js     # [Jennifer] Farmaci, equivalenti, farmacie, distretti, geocode
├── public/
│   ├── index.html               # [Jennifer] Shell UI e sezioni tab
│   ├── css/style.css            # [Jennifer] Design system e stili
│   └── js/
│       ├── api.js               # Helper condiviso fetch + JWT
│       ├── search-map.js        # [Jennifer] Logica ricerca, ASL e mappa Leaflet
│       ├── reports-auth.js      # [Gabriele] Logica auth e CRUD segnalazioni
│       └── admin.js             # [Marco] Logica upload dataset e moderazione
└── tests/
    └── api.test.js              # [Gabriele] Test API automatici
```

---

## 4. Schema Database (SQLite — `src/db/schema.sql`)

- **`users`**: `id`, `name`, `email` (UNIQUE), `password_hash`, `role` (`'cittadino' | 'admin'`), `created_at`
- **`districts`**: `id`, `comune`, `provincia`, `asl_name`, `district_name`, `district_code`
- **`pharmacies`**: `id`, `ministry_code` (UNIQUE), `name`, `type` (`'farmacia' | 'parafarmacia'`), `address`, `comune`, `provincia`, `cap`, `lat`, `lng`, `district_id` (FK → `districts.id`)
- **`medicines`**: `id`, `aic_code` (UNIQUE), `commercial_name`, `active_ingredient`, `atc_code`, `holder`, `price`, `is_generic` (0/1), `prescription_required` (0/1)
- **`reports`**: `id`, `user_id` (FK → `users.id`), `pharmacy_id` (FK → `pharmacies.id`), `medicine_name`, `category` (`'turno' | 'disponibilita' | 'disservizio' | 'altro'`), `message`, `status` (`'pending' | 'approved' | 'rejected'`), `created_at`, `updated_at`

---

## 5. Contratti API REST

Tutte le risposte API sono in formato JSON. In caso di errore restituiscono `{ "error": "messaggio leggibile" }` con status HTTP appropriato (`400`, `401`, `403`, `404`, `409`, `500`).

### Auth (`/api/auth`) — `feat/auth-and-reports`
- `POST /api/auth/register` — `{ name, email, password }` → `201` `{ token, user }` (ruolo sempre `cittadino`)
- `POST /api/auth/login` — `{ email, password }` → `200` `{ token, user }`
- `GET /api/auth/me` (Header `Authorization: Bearer <token>`) → `200` `{ user }`

### Segnalazioni (`/api/reports`) — `feat/auth-and-reports`
- `GET /api/reports` — opzionale `?pharmacy_id=&category=`. Ospite: solo `approved`; utente autenticato: `approved` + proprie segnalazioni in qualsiasi stato.
- `POST /api/reports` (Auth) — `{ pharmacy_id, medicine_name, category, message }` → `201` (creata con stato `pending`)
- `PUT /api/reports/:id` (Auth, solo proprietario o `admin`) — aggiorna campi e resetta a `pending` se modificata dal cittadino
- `DELETE /api/reports/:id` (Auth, solo proprietario o `admin`) → `200`

### Ricerca, Equivalenti & Mappa (`/api/search` / `/api/...`) — `feat/search-map-ui`
- `GET /api/medicines?q=...` — cerca per `commercial_name` o `active_ingredient`, restituendo per ogni farmaco anche i relativi `equivalents` (stesso `active_ingredient`, ordinati per `price ASC`)
- `GET /api/pharmacies?comune=...&lat=...&lng=...&radius_km=...` — lista farmacie/parafarmacie (con `distance_km` se `lat`/`lng` presenti)
- `GET /api/districts?comune=...` — restituisce ASL e distretto socio-sanitario del comune richiesto
- `GET /api/geocode?q=...` — interroga OpenStreetMap Nominatim con `NOMINATIM_USER_AGENT` e restituisce `{ lat, lng, display_name }`

### Admin (`/api/admin`) — `feat/data-ingestion-admin`
- `POST /api/admin/upload/:dataset` (Solo `admin`, `multipart/form-data` campo `file`) — `dataset` ∈ `pharmacies | medicines | districts`; valida e importa CSV/JSON nel DB, restituisce `{ inserted, updated, skipped }`
- `GET /api/admin/reports?status=...` (Solo `admin`) — tutte le segnalazioni con info utente e farmacia
- `PATCH /api/admin/reports/:id/status` (Solo `admin`) — `{ status: 'approved' | 'rejected' }`

---

## 6. Convenzioni di codice

- CommonJS (`require` / `module.exports`) coerente in tutto `src/` e `data/`.
- Indentazione a 2 spazi, punto e virgola coerente, nomi di file in `kebab-case` o `dot.case` (`auth.routes.js`).
- Query SQL sempre parametrizzate (`?` di `better-sqlite3`) per prevenire SQL injection.
- Nessun segreto, token, password reale o dato personale reale nel repository.
- Utenti di prova **esclusivamente inventati** (es. `cittadino@pharmapuglia.test` / `admin@pharmapuglia.test`).

---

## 7. Workflow Git, Branch e Pull Request

### Branch del progetto
1. `chore/project-setup` — setup iniziale, scheletro, schema DB, `decisioni.md`, `AGENTS.md`
2. `feat/data-ingestion-admin` — Marco (`DarkFury17`)
3. `feat/auth-and-reports` — Gabriele (`Fariguu`)
4. `feat/search-map-ui` — Jennifer (`jenniferdibenedetto`)
5. `fix/integration-polish` — integrazione finale e bugfix post-merge
6. `docs/readme-and-screenshots` — screenshot e `README.md` finale

### Criterio obbligatorio per ogni Pull Request
**Nessun push diretto su `main`.** Ogni modifica entra su `main` seguendo rigorosamente questi 3 passaggi:
1. **Pubblicazione dall'utente:** l'autore pusha il proprio branch su `origin` e apre la Pull Request verso `main` con descrizione chiara delle modifiche e di come testarle.
2. **Review richiesta agli altri utenti:** l'autore assegna come *Reviewers* gli altri membri del gruppo, che verificano codice, rispetto dei contratti API e assenza di segreti/dati reali.
3. **Merge dopo la review:** il merge su `main` avviene **solo dopo l'approvazione** della review.
