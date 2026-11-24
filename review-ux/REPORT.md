# Review UX/UI PharmaPuglia OpenCare: report finale (Fase 4)

Data: 2026-11-24. Base: ux.md, persona.md, ui.md, a11y.md (Fase 2), verifica.md (Fase 3), evidence/EVIDENCE.md e verifica-screens/.
Nota di salvataggio: il testo è stato prodotto dall'agente UI Finish-Gate Reviewer, che non ha potuto scrivere il file per un rifiuto di sistema, e salvato in questo percorso dall'orchestratore.

Conteggio per gravità: P0 confermati 0 (1 smentito, in Scartati). P1 confermati 8 (16 ID di origine). P2 9 voci (11 ID di origine, non verificati in Fase 3). P3 2 voci (non verificate in Fase 3).

**Decisione: HOLD.** Restano 8 problemi P1 confermati dalla verifica. Nessun P0 confermato.

## 1. Sintesi

- Fase 3 ha testato 17 P0/P1: 16 confermati come P1, 1 (PER-01, P0) smentito come P0 e riportato in Scartati.
- Dopo l'unione dei doppioni restano 8 problemi P1 (16 ID di origine), 9 voci P2 e 2 voci P3 non verificate in Fase 3.
- Il rischio più alto è informativo: la ricerca farmaci mostra dati stantii o uno stato di caricamento senza fine, il regime di dispensazione è presentato come certo per ogni farmaco, e l'upload admin con 0 record risulta come successo.
- Quasi tutte le correzioni sono di impegno S: testi, visibilità dei messaggi, un `try/catch`. Non serve cambiare framework o design system.
- Il gate passa a PASS quando P1-01 … P1-08 sono chiusi e verificati con le condizioni indicate in ciascun dettaglio.

## 2. Tabella dei P1 confermati

Ordine: gravità, poi impegno (S prima di M), poi ID. Impegno S = modifica locale, M = più punti da coordinare. Le righe si riferiscono a `public/`, salvo dove indicato.

| ID | Gravità | Problema | Vista | Impegno | File |
|---|---|---|---|---|---|
| P1-01 | P1 | Errore nella ricerca farmaci: riepilogo fermo su "Caricamento", risultati precedenti senza messaggio. Origine: UX-01, UX-02, UI-01, PER-03, A11Y-04 | Cerca & Mappa, riepilogo farmaci | S | `js/search-map.js:283-298`, `:841-858`; `index.html:172`; `js/api.js:27` |
| P1-02 | P1 | Badge "Ricetta Medica Obbligatoria" su ogni farmaco; filtro "Senza ricetta" sempre vuoto. Origine: UX-03, PER-02 | Cerca & Mappa, card e filtro regime | S | `js/search-map.js:428-429`, `:446-451`; `index.html:147` |
| P1-03 | P1 | Upload con 0 record inseriti mostrato come successo. Origine: UX-04, UI-02, PER-06 | Area Admin, sezione 1 | S | `js/admin.js:140-143`, `:151-153`; `css/style.css:1085-1090` |
| P1-04 | P1 | Distretto e codice presentati come "Open Data Regione Puglia" senza alcun avviso. Origine: UI-03 | Hero e Inquadramento Comune | S | `index.html:45`, `:74`; `js/search-map.js:165-189` |
| P1-05 | P1 | Esiti di GPS e geocodifica finiscono nel banner in cima alla pagina, lontano dal pulsante; regione live nascosta con `display:none`. Origine: PER-04, A11Y-03, UI-05 (P2), UX-06 (P2) | Sezione mappa in fondo | S | `js/search-map.js:761`, `:778`, `:784`, `:800-803`; `js/api.js:35-41`; `index.html:37`, `:250`; `css/style.css:296-298` |
| P1-06 | P1 | Esito dell'upload non annunciato: il box non ha `role` né `aria-live`. Origine: A11Y-02 | Area Admin, sezione 1 | S | `js/admin.js:105-108`, `:158`, `:165` |
| P1-07 | P1 | Su mobile mappa e farmacie arrivano a 6,7 schermate dalla griglia farmaci; nessun collegamento di ancoraggio. Origine: PER-05 | Cerca & Mappa, 375 px | S | `index.html` (ordine sezioni, righe 40-280); `js/search-map.js:21` |
| P1-08 | P1 | Focus perso dopo azioni che ricostruiscono il DOM (login, salva, approva, mostra su mappa, rimuovi filtro). Origine: A11Y-01 | Segnalazioni, Area Admin, Mappa | M | `js/reports-auth.js:109`, `:348-350`, `:374-375`, `:391-398`; `js/admin.js:221-225`, `:343`, `:371`; `js/search-map.js:157`, `:225`, `:479-495`, `:732-736` |

## 3. Dettaglio dei P1 confermati

### P1-01: Ricerca farmaci in errore

- **Prova.** Con `/api/medicines` interrotta, dopo 3 s il riepilogo resta "Caricamento prontuario farmaci in corso...", le card sono 0 e il banner mostra "Failed to fetch" (verifica: `review-ux/verifica-screens/net-caso1-errore-iniziale.png`; Fase 1: `review-ux/evidence/H-1280-02.png`). Con il server fermo, dopo la ricerca "Omeprazolo" e poi "Paracetamolo", il riepilogo resta "Primi 60 di 212 … Omeprazolo" con 60 card invariate e nessun messaggio, con due `pageerror` non gestiti (`review-ux/verifica-screens/net-caso2-server-spento.png`; `review-ux/evidence/H-1280-04.png`). Codice: `js/search-map.js:298` chiama `PharmaAPI.request` senza `catch`; `index.html:172` è testo statico; `js/api.js:27` lascia passare l'errore grezzo di `fetch`.
- **Correzione minima.** Avvolgere il corpo di `loadMedicines` (`search-map.js:283`) in `try/catch`. Nel `catch` impostare `summaryEl.textContent` con "Non riesco a caricare i farmaci. Controlla la connessione e riprova.", svuotare `#medicine-results-grid` e aggiungere un pulsante "Riprova". Tradurre `TypeError` in `api.js:27`.
- **Verifica.** Con rete bloccata e con server fermo: il riepilogo mostra l'errore in italiano, la griglia non mostra risultati precedenti e non compaiono `pageerror` non gestiti.

### P1-02: Regime di dispensazione presentato come certo

- **Prova.** Ricerca "Paracetamolo": 15 card su 15 con "Ricetta Medica Obbligatoria (RR)". Ricerca "Omeprazolo": 60 su 60 con lo stesso badge. Il filtro "Senza ricetta (SOP / OTC)" (`index.html:147`) è abilitato e produce "Nessun medicinale disponibile con i filtri selezionati"; l'API `/api/medicines?prescription=0` restituisce 0 record. Il limite è documentato nel README (sezione 9, riga 231, come riporta `verifica.md`) ma l'interfaccia non lo riporta (`review-ux/verifica-screens/ricetta-card-ricetta.png`; `review-ux/verifica-screens/ricetta-filtro-senza-ricetta.png`). Codice: `js/search-map.js:428-429` e `:446-451`.
- **Correzione minima.** Nelle card non mostrare il badge come fatto: sostituirlo con "Regime non verificato in questo dataset", oppure nasconderlo. In `index.html:147` disabilitare l'opzione "Senza ricetta" con la nota "Dato non disponibile in questo dataset". Cambiare anche il pulsante "Trova Farmacie abilitate (richiede ricetta)" in `search-map.js:450`.
- **Verifica.** Nessuna card presenta "Obbligatoria" come fatto e il filtro non porta a un vicolo cieco.

### P1-03: Upload con 0 record mostrato come successo

- **Prova.** Upload di un CSV con intestazioni `colonna_a,colonna_b` sul dataset Presidi: il box ha `data-type="success"` e dice "elaborato con successo!" con "Nuovi record inseriti: 0", "Record scartati: 1" (`review-ux/verifica-screens/upload-upload-colonne-errate.png`; `review-ux/evidence/G-1280-02.png`). Codice: `js/admin.js:140` imposta `success` sempre quando la risposta è 2xx, senza controllare `inserted`/`updated`; `admin.js:143` scrive il titolo. In `css/style.css:1085-1090` esistono solo gli stati `success` ed `error`: manca uno stato di avviso.
- **Correzione minima.** In `admin.js:140`, se `data.inserted + data.updated === 0`, usare `warning` (o `error`) con titolo "Nessun record importato: N scartati su M". Aggiungere in `style.css` le regole `.notice-box[data-type="warning"]` con `var(--warning-soft)` e `var(--warning)`, già definite in palette (righe 20-21).
- **Verifica.** Upload di un file errato: il box non è verde e il titolo dice che nessun record è entrato. Upload di un file valido: resta il messaggio di successo.

### P1-04: Distretti presentati come Open Data senza avviso

- **Prova.** Il kicker "Open Data Regione Puglia" (`index.html:74`) e il badge "Open Data Puglia" (`index.html:45`) compaiono sopra distretto e codice. Per Accadia (DSS-FG-ACC) e Lecce (DSS-LE-01) la card mostra distretto e codice senza avviso. Nella pagina non compare nessuna occorrenza di "generat", "indicativ", "verific", "conferma" o "ufficial" (`review-ux/verifica-screens/distretti-distretto-lecce.png`). Il README (sezione 9) dichiara che per 109 Comuni su 257 distretto e codice sono generati. Fase 2 aveva classificato il punto come limite noto; la verifica conferma che l'interfaccia non lo riporta, quindi resta P1. Codice: `js/search-map.js:165-189`.
- **Correzione minima.** Cambiare il kicker in `index.html:74` in "Dati territoriali · conferma con la tua ASL". Rimuovere "Open Data Puglia" dal badge in `index.html:45`. Sotto la griglia della card in `search-map.js` aggiungere: "Distretto e codice possono non essere ufficiali per tutti i Comuni: conferma con la tua ASL." L'app non distingue i 109 Comuni generati, quindi la riga va mostrata per tutti.
- **Verifica.** Selezionare Lecce e Accadia: la riga di avviso compare, nessun testo presenta il dato come ufficiale.

### P1-05: Esiti GPS e geocodifica fuori vista

- **Prova.** "Usa GPS" senza permesso: `#global-feedback` contiene "Permesso GPS negato o posizione non disponibile…" a 93 px dall'alto della pagina, cioè fuori viewport quando il pulsante (top 380 px) è visibile (`review-ux/verifica-screens/gps-gps-negato.png`). `#geocode-status-bar` (`index.html:250`, con `role="status"`) resta `is-hidden` e vuota. Il codice è in `js/search-map.js:800-803`, con `showFeedback` in `js/api.js:35-41`. `css/style.css:296-298` (`.is-hidden { display: none !important }`) rimuove la regione live tra un messaggio e l'altro. Lo stesso accade per "Calcola distanza" con indirizzo non trovato (`search-map.js:761`, `:778`, origine UI-05). Annuncio con lettore: NON VERIFICABILE.
- **Correzione minima.** Scrivere gli esiti GPS e geocodifica in `#geocode-status-bar` con `textContent`, togliendo `is-hidden`, vicino ai pulsanti. In CSS nascondere solo visivamente il contenuto della regione live, senza `display:none` sul contenitore. Per gli errori usare `role="alert"`.
- **Verifica.** Permesso negato e indirizzo inesistente: il messaggio compare accanto al pulsante senza scorrere la pagina.

### P1-06: Esito upload non annunciato

- **Prova.** A riposo `#upload-result-box` ha classe `notice-box is-hidden`, senza `role` né `aria-live` (`js/admin.js:105-108`). Il genitore non ha regioni live. Il box viene mostrato togliendo `is-hidden` (`admin.js:158`, `:165`). Il testo del pulsante cambia senza annuncio (`admin.js:123`, `:168`). Che il lettore annunci l'esito è NON VERIFICABILE in questa fase.
- **Correzione minima.** Rendere permanente il contenitore con `role="status"` e `aria-live="polite"`. Per gli errori usare `role="alert"`. Svuotare il contenuto invece di nascondere il contenitore.
- **Verifica.** Con NVDA o VoiceOver, caricare un CSV valido e uno non valido: l'esito viene letto senza spostare il focus.

### P1-07: Mappa e farmacie troppo in basso su mobile

- **Prova.** A 375 px, ricerca "Omeprazolo": altezza pagina 9.573 px, griglia farmaci a 2.276 px, mappa (`#map-section-card`) a 7.751 px. Distanza 5.475 px, cioè 6,7 schermate da 812 px (il report persona indicava 9 schermate e circa 8.500 px; le misure corrette sono quelle di verifica). Nel DOM ci sono 60 card, ma `search-map.js:21` (`VISIBLE_MEDICINES = 9`) ne mostra 9 poi "Mostra altri". Non esiste nessun collegamento verso mappa o farmacie (`review-ux/verifica-screens/mobile-mobile-omeprazolo.png`). Overflow orizzontale 0.
- **Correzione minima.** Aggiungere in `index.html`, nell'hero o sopra i risultati, un collegamento "Vai alla mappa delle farmacie" verso `#map-section-card`.
- **Verifica.** A 375 px, il collegamento porta alla mappa con un tocco, senza overflow orizzontale.

### P1-08: Focus perso dopo le azioni

- **Prova.** Da tastiera, con azione riuscita, `document.activeElement` è BODY dopo: login cittadino (Invio su "Accedi"), approvazione della segnalazione #1 in Area Admin, e "Mostra presidi di Lecce su mappa" (`review-ux/verifica-screens/focus-admin-dopo-approva.png`). Il codice spiega il fenomeno: `reports-auth.js:348-350` sostituisce il form con `renderAccount`; `admin.js:221-225` e `:343` ricostruiscono la tabella dopo ogni azione; `search-map.js:157` e `:225` sostituiscono con `innerHTML` il pannello distretto; `search-map.js:479-495` nasconde il contenitore che contiene "Rimuovi filtro". Le righe di `reports-auth.js` sono citate da Fase 2 e non le ho riviste una per una.
- **Correzione minima.** Dopo ogni azione spostare il focus su un elemento stabile: il titolo del pannello con `tabIndex = -1`, oppure il campo successivo. Esempi: dopo l'approvazione, l'intestazione della tabella; dopo "Mostra presidi", `.district-card-title`.
- **Verifica.** Tab e Invio su ciascuna azione: `document.activeElement` non è BODY. Con un lettore di schermo, il nuovo titolo viene annunciato (non verificato).

## 4. P2 e P3 (non verificati in Fase 3)

Questi punti non sono stati verificati in Fase 3. Restano con la gravità di origine e sono elencati in forma breve. Le voci uniscono i doppioni.

**P2**

- **P2-A (UX-05, UI-04).** Messaggi tecnici in inglese, "Failed to fetch", nel banner. `reports-auth.js:84` usa già un testo in italiano per lo stesso caso. Correzione: messaggio italiano in `js/api.js:27`. Impegno S.
- **P2-B (UI-06, A11Y-09; UX-07 P3 unito).** Link di attribuzione Leaflet alto circa 14 px, sotto i 24 px. Nessuna regola CSS per `.leaflet-control-attribution`. Correzione: `min-height: 24px` sul link in `css/style.css`. Impegno S. Se l'eccezione WCAG 2.5.8 per gli inline non si applica, UI-06 indica di salire a P1.
- **P2-C (A11Y-05).** La sezione attiva della barra superiore non è annunciata (`index.html:25-27`; `js/api.js:56` cambia solo la classe). Correzione: `aria-current="page"` sul pulsante attivo. Impegno S.
- **P2-D (A11Y-06).** I pulsanti "Trova Farmacie…" (`search-map.js:442-453`) e "Mostra su mappa" (`:605-607`) hanno lo stesso nome per ogni scheda. Correzione: testo `sr-only` con il nome del farmaco o della farmacia. Impegno S.
- **P2-E (A11Y-07, UI-07 P3 unito).** Farmacie e parafarmacie distinte solo per tonalità (contrasto tra i due colori 1,22:1). Il popup non indica il tipo (`js/search-map.js:671-689`). La mappa usa `preferCanvas: true` (`:63`), quindi i marker non sono focusabili; l'elenco laterale offre gli stessi dati. Correzione: tipo nel popup e bordo o forma diversi. Impegno M.
- **P2-F (A11Y-08).** Elenco dei presidi senza limite (fino a 1.936 voci) e `aria-live` sul contenitore (`js/search-map.js:568-620`; `index.html:277`). Correzione: limitare a N voci con "Mostra altri" e lasciare l'annuncio sul solo conteggio. Impegno M.
- **P2-G (PER-07).** In moderazione la lista si svuota a ogni azione (`js/admin.js:225`), non c'è un contatore "In attesa: N" (`admin.js:232-239`) e l'esito compare in cima alla pagina (`admin.js:365`). Impegno M.
- **P2-H (PER-08).** Testi di supporto a 0,74-0,8 rem (`css/style.css:353-357`, `:655-657`, `:727-730`) e lista equivalenti con scroll annidato (`:692-697`, `max-height: 13rem` alla riga 696). Impegno S.
- **P2-I (PER-09).** "Tachipirina" è l'esempio del placeholder (`index.html:127`) e del chip (`index.html:157`), ma il dato non lo contiene. Correzione: sostituire con un principio attivo presente o dichiarare il limite nel messaggio di assenza. Impegno S.

**P3**

- **P3-A (UI-08).** A 1280x800 la sezione farmaci inizia sotto la piega (titolo a circa 1.070 px). Il hero-card eredita il padding di `.card`. Correzione: ridurre padding e `max-height` di `.district-summary-list` (`css/style.css:548`, 195 px). Impegno S.
- **P3-B (A11Y-10).** Le segnalazioni non hanno titolo (`js/reports-auth.js:402-438`), il titolo della pagina è fisso (`index.html:6`), la tabella admin non ha `caption` (`js/admin.js:241`). Impegno S.

## 5. Cosa funziona bene

1. **Stato vuoto della ricerca farmaci.** Il messaggio con suggerimento di principio attivo è chiaro. Prova: `review-ux/evidence/B-1280-01.png` e il flusso B di `review-ux/evidence/EVIDENCE.md`.
2. **Testi degli utenti e dei dati admin con `textContent`.** Prova: `js/admin.js:143` e `:163` usano `textContent`; `review-ux/a11y.md` non trova `innerHTML` per dati utente, salvo `escapeHtml` nei dataset.
3. **Nessun overflow orizzontale a 375 px.** Prova: `scrollWidth = clientWidth = 375` per "Omeprazolo" (verifica, PER-05); overflow 0 in tutti i flussi (`EVIDENCE.md`, Controlli trasversali).
4. **Focus visibile e contrasti sopra soglia.** Outline di 2 px su tutti i controlli raggiunti da Tab (`EVIDENCE.md`). Pulsante primario 5,47:1, bordo campo 3,35:1, testo secondario 6,38:1 (`review-ux/a11y.md`, tabella dei contrasti).
5. **Errore di login in italiano e ruolo visibile.** Login errato: "Email o password non corrette." con 401 atteso; dopo il login compare il ruolo nella barra. Prova: `review-ux/evidence/E-1280-01.png` … `E-1280-04.png` e flusso E di `EVIDENCE.md`.

## 6. Le cinque correzioni da fare per prime

1. **P1-02.** Togliere la certezza sul regime di dispensazione e disabilitare il filtro "Senza ricetta" (impegno S). Rischio: un'informazione terapeutica sbagliata.
2. **P1-01.** `try/catch` in `loadMedicines` con messaggio italiano e griglia svuotata (impegno S). Rischio: prezzi e farmacie stantii.
3. **P1-03.** Esito dell'upload coerente con i numeri (impegno S). Rischio: dataset non aggiornati dati per buoni.
4. **P1-05.** Esiti GPS e geocodifica vicino ai pulsanti (impegno S).
5. **P1-04.** Avviso sulla provenienza di distretto e codice (impegno S).

Dopo questi: P1-06 e P1-07 (impegno S), poi P1-08 (impegno M).

## 7. Scartati o non verificabili

- **PER-01 (P0, SMENTITO).** La gravità P0 non è confermata. Il disclaimer "dosaggio, forma e confezione possono essere diversi" (`index.html:175`) è a 29 px sopra la prima card, non lontano. La dose assente è un limite del dato (README, sezione 9, riga 233; nessun nome commerciale contiene "mg" su 8.598 record). **Nota:** `verifica.md` suggerisce P1 (declassamento da P0). Non riclassifico: lo riporto come nota. Il rilievo residuo (badge "Prezzo più basso della categoria" senza avvertenza nella card, `review-ux/verifica-screens/equiv-card-equivalenti.png`) non è stato confermato come problema separato.
- **UI-03, sotto-affermazione.** L'elenco dei 109 Comuni con distretto generato è NON VERIFICABILE: nessun campo nei dati lo indica. Il fix P1-04 non dipende dall'elenco.
- **A11Y-02 e A11Y-03, annuncio del lettore.** La marcatura e la posizione sono confermate, l'annuncio è NON VERIFICABILE. Restano P1 per la parte confermata; se un test con lettore smentisse l'annuncio, il problema resterebbe in P1-05 e P1-06 come posizione e regione nascosta.
- **Limiti già scartati in Fase 2.** "Senza ricetta" e "Tachipirina" erano stati scartati come limiti noti. Ora la verifica conferma P1-02 e P2-I, perché l'interfaccia non segnala il limite. Il limite dei 60 risultati, il contrasto di `--text-secondary` e la tabella admin con `min-width: 860px` (`css/style.css:1135-1137`, non provata su mobile) restano fuori.

## 8. Cosa non è stato provato

- **Lettori di schermo** (NVDA, JAWS, VoiceOver, TalkBack): nessun test. Gli annunci di P1-05 e P1-06 non sono verificati.
- **Focus dopo le azioni (P1-08):** misurato per tre azioni in Chrome. Non testate: liste "Approvate" e "Rifiutate", modifica con stato cambiato, e le altre azioni, dedotte dal codice.
- **Ramo GPS con permesso concesso:** non provato. La verifica ha usato solo il rifiuto.
- **Zoom 200% e 400%, colori forzati, riduzione del movimento, simulazione del daltonismo:** non testati.
- **Contrasto dei marker su tile reali:** non misurato, solo valori di riferimento.
- **Revisione visiva mobile di ogni schermata:** solo metriche, non controllo di ogni schermata.
- **README:** non riletto in questa fase. Le righe 231 e 233 e la sezione 9 sono riportate come da `verifica.md`.
- **Citazioni.** Verificati l'esistenza degli screenshot citati e dei simboli e delle righe citate per i P1 (in particolare `index.html:37`, `:147`, `:172`, `:175`, `:211`, `:250`, `:277`; `search-map.js:21`, `:63`, `:298`, `:381-382`, `:391-392`, `:403`, `:429`, `:800-803`; `admin.js:105-108`, `:140-143`, `:161`, `:225`; `api.js:27`, `:35-41`, `:56`; `style.css:296-298`, `:696`, `:1085`, `:1135-1137`; `reports-auth.js:70`, `:385`, `:431`). Non riletti una per una i range minori: `search-map.js:906-920` e `:949-954`, `reports-auth.js:109`, `:348-350`, `:374-375`, `:391-398`, `style.css:353-357`, `:655-657`, `:727-730`.
- **Correzioni applicate:**
  - PER-02 (Fase 2): il filtro "Senza ricetta" è a `index.html:147`, non 148.
  - PER-05: mappa a 7.751 px e 6,7 schermate, non circa 8.500 px e 9.
  - PER-01: disclaimer a 29 px sopra la griglia, non lontano.
  - `verifica.md` cita `review-ux/verifica-screens/card-equivalenti.png`: il file reale è `review-ux/verifica-screens/equiv-card-equivalenti.png`.
  - UI-03 e UX-03 dichiaravano il limite "non nascosto" o "documentato": la verifica conferma che il limite è documentato nel README ma non nell'interfaccia.
- **Non letti per scelta:** `.env` e `data/pharmapuglia.db`. Non ho modificato codice né creato commit. Non ho avviato l'app in questa fase: i fatti vengono dalle misure di Fase 3 e dalle prove di Fase 1.
