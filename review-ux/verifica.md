# Verifica Fase 3: reality check su P0 e P1

Ambiente: app avviata da zero con `npm run seed` e `npm start` (porta 3100, database temporaneo nella scratchpad, segreti generati in memoria e mai scritti). Browser Chrome di sistema via playwright-core. Dati di prova: utenti `.test` (admin e cittadino del seed), CSV invalido di due colonne (`qa-invalid.csv`). Il file `.env` e `data/pharmapuglia.db` non sono stati letti. Le misure sono riferite a 1280x800 salvo dove indicato 375 px. Gli screenshot delle prove sono in `review-ux/verifica-screens/`.

Non ho rivisto a vista gli screenshot della Fase 1: le prove qui sono misure dal vivo sull'app in esecuzione.

## Tabella

| ID | Gravità dichiarata | Esito | Prova sintetica |
|---|---|---|---|
| PER-01 | P0 | SMENTITO (gravità) | Dose assente nelle voci equivalenti: fatto confermato, ma il disclaimer è a 29 px sopra la prima card e non è "lontano". Il dato non ha dosaggio (limite README). Non sostiene P0. |
| UX-01 | P1 | CONFERMATO | Errore `/api/medicines`: riepilogo fermo su "Caricamento prontuario farmaci in corso...", 0 card, banner "Failed to fetch". |
| UI-01 | P1 | CONFERMATO | Stessa prova di UX-01, più la ricerca successiva che non aggiorna il riepilogo. |
| PER-03 | P1 | CONFERMATO | Stessa prova di UX-01 e UX-02. |
| A11Y-04 | P1 | CONFERMATO | Riepilogo bloccato e risultati stantii senza messaggio di riepilogo. |
| UX-02 | P1 | CONFERMATO | Server fermato dopo "Omeprazolo": riepilogo "Primi 60 di 212... Omeprazolo" e 60 card invariate dopo aver digitato "Paracetamolo"; nessun messaggio visibile. |
| UX-03 | P1 | CONFERMATO | 75 card su 75 mostrano "Ricetta Medica Obbligatoria (RR)"; filtro "Senza ricetta" abilitato e vuoto; nessuna avvertenza nell'interfaccia. |
| PER-02 | P1 | CONFERMATO | Stessa prova di UX-03 (citazione `index.html:148` errata: la riga è 147). |
| UX-04 | P1 | CONFERMATO | CSV con colonne errate: box verde "elaborato con successo!" con 0 inseriti e 1 scartato. |
| UI-02 | P1 | CONFERMATO | Stessa prova di UX-04 (`admin.js:140` e `:143` verificate). |
| PER-06 | P1 | CONFERMATO | Stessa prova di UX-04. |
| UI-03 | P1 | CONFERMATO | Kicker "Open Data Regione Puglia" e badge "Open Data Puglia" sopra distretto e codice, senza alcun avviso (Accadia e Lecce). |
| PER-04 | P1 | CONFERMATO | "Usa GPS" senza permesso: l'errore è in `#global-feedback` a 93 px dall'alto della pagina, fuori viewport quando il pulsante è visibile. |
| A11Y-01 | P1 | CONFERMATO | Enter su "Accedi", "Approva" e "Mostra presidi di Lecce su mappa": `document.activeElement` = BODY dopo ogni azione riuscita. |
| A11Y-02 | P1 | CONFERMATO (marcatura) | Box di esito `#upload-result-box` senza `role` né `aria-live`, nessuna regione live nel genitore. L'annuncio al lettore: vedi NON VERIFICABILE. |
| A11Y-03 | P1 | CONFERMATO (posizione e regione nascosta) | `#global-feedback` e `#geocode-status-bar` a riposo `display: none`, errore GPS fuori viewport. L'annuncio: vedi NON VERIFICABILE. |
| PER-05 | P1 | CONFERMATO con correzione | Mappa a 7.751 px dall'alto, griglia farmaci a 2.276 px: distanza 5.475 px, cioè 6,7 schermate da 812 px (non 9; stima 8.500 px errata). 9 card visibili su 60 nel DOM. |

Conteggio: P0 testati 1 (SMENTITO). P1 testati 16: CONFERMATO 16 (di cui 2 con parte dell'annuncio non verificabile). Non verificato: nessun P0/P1 è rimasto senza prova; restano NON VERIFICABILE solo i due annunci di lettore di schermo e l'elenco dei 109 comuni generati.

## CONFERMATO

**UX-01, UI-01, PER-03, A11Y-04 (errore di rete all'avvio).** Con `/api/medicines` interrotta (route abort), dopo 3 s `#medicine-results-summary` dice ancora "Caricamento prontuario farmaci in corso...", le card sono 0 e `#global-feedback` mostra "Failed to fetch" a 93 px dall'alto (display block, role=status). Il riepilogo non viene mai aggiornato, come descritto. Il codice `search-map.js:298` (nessun try/catch in `loadMedicines`), `index.html:172` (testo statico) e `api.js:27` sono presenti. Prova: `review-ux/verifica-screens/net-caso1-errore-iniziale.png`.

**UX-02, A11Y-04, PER-03 caso server fermo.** Caricata la pagina, ricerca "Omeprazolo": riepilogo "Primi 60 di 212 medicinali per 'Omeprazolo'" e 60 card. Fermato il server, digitato "Paracetamolo" e premuto Invio: riepilogo e card restano uguali (60, "Omeprazolo"), `#global-feedback` ha `display: none` e testo vuoto, cioè nessun messaggio. Sono stati generati due `pageerror` "Failed to fetch" non gestiti (`search-map.js:298`). Prova: `review-ux/verifica-screens/net-caso2-server-spento.png`.

**UX-03, PER-02 (regime di dispensazione presentato come fatto).** Ricerca "Paracetamolo": 15 card su 15 con "Ricetta Medica Obbligatoria (RR)" e nessuna "Senza Ricetta". Ricerca "Omeprazolo": 60 su 60 con lo stesso badge. Il filtro "Senza ricetta (SOP / OTC)" (`index.html:147`) è abilitato e produce "Nessun medicinale disponibile con i filtri selezionati."; l'API `/api/medicines?prescription=0` restituisce 0 record. Nel testo della pagina non c'è alcuna avvertenza sul dato: la ricerca di "dato", "limite", "verifica" e "non disponibile" trova solo un indirizzo. Il limite è documentato nel README (sezione 9, riga 231) e nei dati (`data/raw/medicines.json`: `prescription_required` = 1 per tutti gli 8.598 record). Per la regola sui dati è un limite dei dati, ma l'interfaccia lo presenta come fatto e non lo segnala: il problema è dell'interfaccia. Prova: `review-ux/verifica-screens/ricetta-card-ricetta.png`, `ricetta-filtro-senza-ricetta.png`.

**UX-04, UI-02, PER-06 (upload con 0 record come successo).** Upload come admin di un CSV con intestazioni `colonna_a,colonna_b` (una riga) sul dataset "Presidi". Il box `#upload-result-box` ha `data-type="success"` e testo: "Dataset "pharmacies" elaborato con successo! Nuovi record inseriti: 0 Record aggiornati: 0 Record scartati: 1 Totale esaminati: 1". Il codice `admin.js:140` (`dataset.type = 'success'`) e `admin.js:143` (titolo) corrisponde. Prova: `review-ux/verifica-screens/upload-upload-colonne-errate.png`.

**UI-03 (distretti presentati come Open Data senza avviso).** Il badge dell'hero "Servizio Sanitario Regionale · Open Data Puglia" (`index.html:45`) e il kicker "Open Data Regione Puglia" (`index.html:74`) compaiono. Per Accadia (ASL Foggia, DSS-FG-ACC) e Lecce (ASL Lecce, DSS-LE-01) la card mostra distretto e codice senza avviso: nel contenitore del risultato e in tutta la pagina non compaiono "generat", "indicativ", "verific", "conferma" o "ufficial". Il file `data/raw/districts.json` non ha alcun campo di provenienza, quindi l'interfaccia non può distinguere i 109 comuni con distretto generato: il limite è nei dati, ma la scritta "Open Data" è una presentazione dell'interfaccia. Prova: `review-ux/verifica-screens/distretti-distretto-lecce.png`.

**PER-04 (esito GPS e geocodifica lontano dal pulsante).** "Usa GPS" senza permesso: il pulsante `#use-gps-btn` è in viewport (top 380 px). Dopo 2 s `#global-feedback` contiene "Permesso GPS negato o posizione non disponibile..." ma a 93 px dall'alto della pagina, cioè -2.716 px rispetto alla viewport: fuori dalla vista. `#geocode-status-bar` (`role="status"`, nella sezione mappa) resta `is-hidden` e vuota. Il codice `search-map.js:799-803` e `api.js:35-41` corrisponde. Prova: `review-ux/verifica-screens/gps-gps-negato.png`.

**A11Y-01 (focus perso dopo azione).** Da tastiera (focus sul pulsante, Invio) e con azione riuscita: login cittadino, `document.activeElement` = BODY (badge poi "Mario Rossi · Cittadino"). Approvazione della segnalazione #1 da admin: BODY (feedback "Segnalazione #1 impostata su approved"). "Mostra presidi di Lecce su mappa": BODY. Caveat: Chrome può ricordare un punto di partenza per Tab, ma `activeElement` è misurato direttamente. Prova: gruppo `focus` (screenshot `review-ux/verifica-screens/focus-admin-dopo-approva.png`).

**A11Y-02 (marcatura del box di esito).** A riposo `#upload-result-box` ha classe `notice-box is-hidden`, senza `role` né `aria-live`; il genitore non ha regioni live (`admin.js:105-108` corrisponde). Dopo l'upload il box non ha `role` né `aria-live` in nessuno stato. Il fatto che il lettore lo annunci resta NON VERIFICABILE.

**A11Y-03 (regioni live nascoste, errori lontani).** `#global-feedback` ha `role="status" aria-live="polite"` ma a riposo `display: none` (misurato nel caso server fermo, dove il banner risultava `none`); `style.css:296-298` (`.is-hidden { display: none !important }`) e `#geocode-status-bar` (`is-hidden`) confermano il meccanismo. L'errore GPS è fuori viewport (PER-04). Il fatto che la lettura vocale avvenga o no è NON VERIFICABILE.

**PER-05 (mappa a metà di una lunga lista su mobile).** Ricerca "Omeprazolo" a 375 px: altezza pagina 9.573 px, griglia farmaci a 2.276 px, mappa (`#map-section-card`) a 7.751 px. Il DOM contiene 60 card, ma le visibili sono 9, poi "Mostra altri". Distanza griglia-mappa 5.475 px = 6,7 schermate da 812 px. Nel DOM non c'è alcun link di ancoraggio verso la mappa o le farmacie (`linkVaiAlleFarmacie` = false). Overflow orizzontale 0 (scrollWidth = clientWidth = 375). Il problema c'è, ma le misure del report vanno corrette: 7.751 px e 6,7 schermate, non circa 8.500 px e 9 schermate. Prova: `review-ux/verifica-screens/mobile-mobile-omeprazolo.png`.

## SMENTITO

**PER-01 (P0, dose assente e disclaimer lontano).** Il fatto di base è confermato: le voci degli equivalenti mostrano solo nome commerciale, AIC, titolare e genericità, e nel DOM nessuna delle 6.396 voci equivalenti di 60 card contiene una dose. Il dataset `data/raw/medicines.json` non ha dosaggi: 0 nomi commerciali su 8.598 con "mg". Ma la tesi del report ha due errori:
- Il disclaimer non è lontano: "Il confronto usa solo il principio attivo: dosaggio, forma e confezione possono essere diversi" (`index.html:175`) sta a 29 px sopra la prima card, direttamente sopra la griglia, ed è nello stesso blocco dei risultati. Non è "non più in vista dopo 9 card": è nel punto in cui inizia la lista.
- Il limite della dose è dichiarato nel README (sezione 9, riga 233). Il dato non è presente nei file, quindi non è un difetto di rendering dell'interfaccia.
Non sostengo quindi P0. Ciò che resta è un problema di presentazione: il badge "Prezzo più basso della categoria" e "Risparmio fino a..." compaiono su ogni card senza ripetere l'avvertenza. Gravità consigliata: P1 (declassare da P0). Prova: `review-ux/verifica-screens/card-equivalenti.png`.

## Citazioni e misure da correggere

- PER-02: il filtro "Senza ricetta" è in `index.html:147`, non 148 (la 148 è "Con ricetta medica").
- PER-05: mappa a 7.751 px, 6,7 schermate (non ~8.500 px e 9).
- PER-01: il disclaimer è a 29 px dalla griglia, non "lontano dalle card".
- UX-03 e UI-03 citano il limite del README: confermato che il limite è documentato, ma l'interfaccia non lo riporta.
- Tutte le righe di codice citate nei quattro file per i P0 e P1 esistono e corrispondono al contenuto, salvo quelle sopra.

## NON VERIFICABILE

- Annunci di lettore di schermo di A11Y-02 e A11Y-03 (il box di esito e i banner live): nessun NVDA, JAWS o VoiceOver nel sandbox. Il comportamento di annuncio dipende dal lettore, non è dimostrabile con il solo DOM.
- Quali dei 109 comuni hanno distretto generato (UI-03, sotto-affermazione del README): nessun campo nei dati lo indica, quindi l'elenco non è ricostruibile dall'app.
- Il ramo "permesso GPS concesso" non è stato provato: il test ha usato il rifiuto del permesso, che è il caso del report.
