# Review UI/UX, Fase 2: UI Designer

Ho esaminato gerarchia visiva, spaziature, coerenza dei componenti con la palette, responsive a 1280 e 375 px e microtesti, partendo da `review-ux/evidence/EVIDENCE.md`, dagli screenshot pertinenti e dal codice in `public/`. Non ho usato il browser né avviato l'app. Ho scartato i punti già in "Limiti noti" del README, salvo quando l'interfaccia li nasconde, e i punti senza prova.

Contrasti misurati con la formula WCAG sulla palette in `public/css/style.css:1-29`: tutte le coppie testo/sfondo usate superano 4,5:1 e il bordo dei campi (`#7c9189` su bianco) è 3,35:1. Non segnalo quindi problemi di contrasto.

Totale: 8 problemi. P0: 0. P1: 3. P2: 3. P3: 2.

Punti scartati: "Senza ricetta" e "Tachipirina" (Limiti noti, README:231-232); badge "Ricetta" su tutti i farmaci (Limiti noti); filtro "Segnalazioni" visibile da ospite, perché `decisioni.md` prevede lettura pubblica delle segnalazioni approvate; copy "sarà pubblica dopo la moderazione" dopo la modifica, perché è corretto per il cittadino (`public/js/reports-auth.js:363-364`); lista farmaci lunga su mobile, perché mostra solo 9 schede (`public/js/search-map.js:21`).

---

### [UI-01] Errore nella ricerca farmaci lascia il riepilogo bloccato su "Caricamento" e i risultati precedenti
Gravità: P1
Flusso e schermo: Flusso H, Cerca e Mappa, sezione "Schede Farmaci e Comparazione Equivalenti AIFA", 1280 px e 375 px.
Passi:
1. Apri la pagina con la rete che restituisce errore su `/api/medicines` (route abortita), oppure con il server fermo dopo il primo caricamento.
2. Osserva il riepilogo sotto il titolo della sezione.
3. Digita "Omeprazolo" nel campo farmaci.
Prova:
- `review-ux/evidence/H-1280-02.png`: banner "Failed to fetch", riepilogo fisso su "Caricamento prontuario farmaci in corso...", contatore "Farmaci AIFA 0", griglia vuota.
- `review-ux/evidence/H-1280-04.png`: server fermo, riepilogo "Primi 60 di 8598 medicinali" con i risultati precedenti e nessun messaggio.
- `public/js/search-map.js:283-298`: `loadMedicines` non ha `try/catch`; l'errore non tocca `#medicine-results-summary`.
- `public/js/search-map.js:841-858`: i gestori di submit, input, cambio filtro e reset chiamano `loadMedicines()` senza `catch`, quindi l'errore non produce alcun feedback.
- `public/index.html:171-173`: il testo "Caricamento prontuario farmaci in corso..." è statico e non viene mai sostituito in caso di errore.
Effetto sull'utente: l'utente non sa se il prontuario si è caricato, vede dati vecchi come se fossero aggiornati e non capisce che la ricerca è fallita.
Correzione minima: in `public/js/search-map.js`, avvolgi il corpo di `loadMedicines` in `try/catch`. Nel `catch` imposta `summaryEl.textContent` con un messaggio in italiano (es. "Impossibile caricare i farmaci. Riprova."), svuota `#medicine-results-grid` e non lasciare risultati precedenti. Aggiungi `.catch` ai gestori indicati sopra. Il contenitore `aria-live="polite"` di `public/index.html:171` è già presente.

### [UI-02] Upload CSV con 0 record inseriti mostrato con box verde "elaborato con successo"
Gravità: P1
Flusso e schermo: Flusso G, Area Admin, upload dataset, 1280 px e 375 px.
Passi:
1. Accedi come admin e apri "Area Admin".
2. Carica un CSV con colonne non riconosciute (es. un file con intestazioni errate).
3. Leggi il box di esito sotto il pulsante "Carica ed Elabora".
Prova:
- `public/js/admin.js:140`: `resultBox.dataset.type = 'success'` è impostato sempre quando la risposta è 200, anche se `inserted` e `updated` sono 0.
- `public/js/admin.js:143`: titolo "Dataset ... elaborato con successo!" con `notice-title` verde.
- `review-ux/evidence/EVIDENCE.md:67-69`: dopo il file errato il box mostra "successo", "Record scartati: 1", "inseriti: 0", e la gerarchia visiva è tutta verde.
- `public/css/style.css:1085-1088`: `.notice-box[data-type="success"]` è l'unico stato positivo; non esiste uno stato di avviso.
Effetto sull'utente: l'admin legge un colore e un titolo di successo mentre il dataset non è cambiato. Può pubblicare o dare per buoni dati non aggiornati.
Correzione minima: in `public/js/admin.js:140`, imposta `data-type` a `'success'` solo se `data.inserted + data.updated > 0`, altrimenti a `'warning'`, con titolo "Nessun record inserito". In `public/css/style.css`, aggiungi `.notice-box[data-type="warning"] { background: var(--warning-soft); border-color: #fde68a; }` e `.notice-box[data-type="warning"] .notice-title { color: var(--warning); }`, usando le variabili già in palette.

### [UI-03] Distretti attribuiti a "Open Data Regione Puglia" senza avviso, anche dove sono generati
Gravità: P1
Flusso e schermo: Flusso C, colonna "Inquadramento Comune → ASL e Distretto", e hero, 1280 px e 375 px.
Passi:
1. Nella colonna "Inquadramento Comune → ASL e Distretto" seleziona un Comune (es. un Comune per cui il distretto è generato, come indicato nel README).
2. Leggi "Distretto Socio-Sanitario" e "Codice Distretto" nella card risultante.
3. Leggi la scritta di sezione sopra il titolo.
Prova:
- `public/index.html:74`: kicker "Open Data Regione Puglia" sopra la sezione che mostra distretto e codice.
- `public/index.html:45`: badge "Servizio Sanitario Regionale · Open Data Puglia" nell'hero.
- `public/js/search-map.js:165-189`: la card mostra `district_name` e `district_code` senza alcuna indicazione di provenienza o affidabilità; nessuna occorrenza di "generat", "indicativ" o "verifica" in `public/`.
- `README.md:228-230` (Limiti noti): per 109 Comuni su 257 distretto e codice sono generati e possono essere errati, "anche se l'interfaccia riporta 'Open Data Regione Puglia'". Il limite non è nascosto dall'interfaccia, quindi rientra nella deroga.
Effetto sull'utente: un cittadino può presentarsi al distretto sbagliato o usare un codice errato, con un'indicazione di fonte ufficiale che rende il dato più credibile.
Correzione minima: in `public/index.html:74` sostituisci il kicker con "Dati territoriali · conferma con la tua ASL". In `public/js/search-map.js:165-189` aggiungi sotto la griglia della card una riga `<p class="small-meta text-muted">` con: "Distretto e codice possono non essere ufficiali per tutti i Comuni: conferma con la tua ASL." Se il backend può marcare i Comuni generati, mostra la riga solo per quelli. In `public/index.html:45` rimuovi "Open Data Puglia" dal badge.

### [UI-04] Messaggio di errore di rete in inglese e tecnico ("Failed to fetch"), a differenza delle segnalazioni
Gravità: P2
Flusso e schermo: Flusso H, banner `#global-feedback`, 1280 px e 375 px.
Passi:
1. Interrompi la rete (o ferma il server) e carica la pagina o cerca un farmaco.
2. Leggi il banner rosso in cima alla pagina.
Prova:
- `review-ux/evidence/H-1280-02.png`: banner con il testo "Failed to fetch".
- `public/js/search-map.js:950-952`: all'errore di caricamento iniziale viene mostrato `err.message`, che per un `TypeError` di `fetch` è "Failed to fetch".
- `public/js/reports-auth.js:84`: lo stesso caso nelle segnalazioni è gestito con "Operazione non riuscita: controlla la connessione e riprova.", quindi la coerenza tra sezioni manca.
Effetto sull'utente: il messaggio è in inglese, tecnico e non indica un'azione. Il tono cambia da una sezione all'altra.
Correzione minima: in `public/js/search-map.js:950-952` (e nei punti 778 e 784) usa un messaggio italiano per `TypeError`, come `reports-auth.js:84`: `err instanceof TypeError ? 'Connessione non riuscita: controlla la rete e riprova.' : err.message`.

### [UI-05] Errori di geocodifica e GPS compaiono in cima alla pagina, lontano dal pulsante usato
Gravità: P2
Flusso e schermo: Flusso D, sezione mappa in fondo alla pagina, 1280 px e 375 px.
Passi:
1. Scorri alla sezione "Mappa Interattiva" in fondo alla pagina.
2. Premi "Usa GPS" senza dare il permesso, oppure "Calcola distanza" con un indirizzo non trovato.
3. Cerca il messaggio di esito.
Prova:
- `public/index.html:37`: `#global-feedback` è il primo elemento di `<main>`, in cima alla pagina.
- `public/js/search-map.js:761`, `778`, `784`, `800`: tutti gli errori di geocodifica e GPS vengono scritti con `showFeedback`, cioè nel banner in cima.
- `public/index.html:250`: esiste già `#geocode-status-bar` con `role="status"`, vicino ai controlli, ma non viene usato per gli errori.
- `review-ux/evidence/EVIDENCE.md:50`: "Usa GPS" senza permesso non mostra esito visibile nell'area di lavoro.
Effetto sull'utente: l'errore resta fuori dal campo visivo mentre l'utente è sulla mappa. Sembra che il pulsante non faccia nulla.
Correzione minima: in `public/js/search-map.js` instrada gli errori di geocodifica e GPS (righe 761, 778, 784, 800) su `#geocode-status-bar` invece che su `showFeedback`, usando `textContent` e rimuovendo la classe `is-hidden`. Riserva il banner globale agli errori di caricamento della pagina.

### [UI-06] Link di attribuzione Leaflet alto circa 14 px, sotto il target minimo di 24 px
Gravità: P2
Flusso e schermo: Flusso A e C, angolo in basso a destra della mappa, 1280 px e 375 px.
Passi:
1. Apri la sezione mappa.
2. Misura i link "Leaflet" e "OpenStreetMap" nell'attribuzione in basso a destra.
Prova:
- `review-ux/evidence/EVIDENCE.md:31` e `:88-94`: misura dell'altezza dei controlli, con 2 target sotto 24 px (link di attribuzione, circa 14 px). Nessuna regola in `public/css/style.css` agisce su `.leaflet-control-attribution`.
- `review-ux/evidence/C-1280-01.png` e `H-1280-02.png`: l'attribuzione è visibile in basso a destra della mappa, con testo piccolo.
- `public/js/search-map.js:68`: l'attribuzione viene passata a Leaflet senza stili dedicati.
Effetto sull'utente: il target è piccolo da cliccare su touch e, per chi ha difficoltà motorie, è difficile da centrare. Il criterio WCAG 2.5.8 (AA) potrebbe non essere soddisfatto. Se l'eccezione per spaziatura non si applica, la gravità sale a P1.
Correzione minima: in `public/css/style.css`, aggiungi `.leaflet-control-attribution a { display: inline-block; min-height: 24px; line-height: 24px; padding-inline: 2px; }`, più un `padding` coerente sul contenitore. Verifica con misura sul 375 px.

### [UI-07] Farmacie e parafarmacie distinte solo per tonalità, con colori vicini
Gravità: P3
Flusso e schermo: Flusso C, legenda sotto la mappa, 1280 px e 375 px.
Passi:
1. Apri la mappa con i presidi caricati.
2. Confronta i punti verdi-teal e blu nella legenda e sulla mappa.
Prova:
- `public/css/style.css:824-830`: `--primary` (#0f766e) per le farmacie e `--accent` (#1d4ed8) per le parafarmacie, due tinte scure e con luminanza simile.
- `review-ux/evidence/A-1280-01.png`: la legenda è l'unica chiave; le forme dei punti sono identiche.
- Non ho letto il codice dei marker in `search-map.js`. Verifica che usino le stesse variabili.
Effetto sull'utente: con deuteranopia o protanopia le due categorie possono sembrare simili. La legenda non dà un secondo canale visivo.
Correzione minima: nella legenda e nei marker, aggiungi un secondo canale come forma (cerchio pieno per le farmacie, quadrato per le parafarmacie) o un bordo diverso. Non cambiare la palette.

### [UI-08] Il contenuto principale dei farmaci inizia sotto la piega a 1280x800
Gravità: P3
Flusso e schermo: Flusso A, 1280 px.
Passi:
1. Apri la home su una finestra 1280x800.
2. Verifica se la sezione "Schede Farmaci" è visibile senza scorrere.
Prova:
- `review-ux/evidence/A-1280-01.png`: il titolo "Schede Farmaci e Comparazione Equivalenti AIFA" è a circa 1.070 px dall'alto (scala 1,92 sull'immagine ridotta). Prima ci sono hero (`public/index.html:42-66`) e due card (`public/index.html:69-164`).
- Il campo di ricerca farmaci è visibile sopra la piega, quindi l'azione primaria c'è.
Effetto sull'utente: l'utente non vede i risultati finché non scorre, e il contenuto sopra la piega è in gran parte decorativo (KPI, intestazione istituzionale).
Correzione minima: in `public/css/style.css`, riduci il padding del `.hero-card` (oggi ereditato da `.card`, `padding: 1.25rem`) e la `max-height` di `.district-summary-list` (`style.css:548`, 195 px) per guadagnare altezza. In alternativa, aggiungi un link "Vai alla ricerca farmaci" accanto all'hero che porti a `#heading-medicines-results`.
