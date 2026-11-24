# Review UX: euristiche di Nielsen e chiarezza delle informazioni sanitarie

Questa review parte dalle prove della Fase 1 (`review-ux/evidence/EVIDENCE.md` e screenshot A-H a 1280 e 375 px) e dal codice in `public/`. Ho riletto i punti critici nel codice e verificato a vista gli screenshot `H-1280-02.png` e `H-1280-04.png`. Non ho usato il browser né avviato l'app. Gli altri riferimenti a schermate si basano su EVIDENCE.md, che non ho potuto controllare pixel per pixel.

Esclusi di proposito: overflow (0 px in tutte le misure), target sotto 44 px (scelta di design densa, criterio AAA), contrasti (calcolati: testo secondario 6.0:1 su fondo badge, avvisi 4.5:1 o più, pulsante primario 5.5:1), messaggio "Nessun medicinale trovato" (chiaro, con suggerimento), "Tachipirina" senza risultati (dichiarato nei limiti noti). Il filtro "Segnalazioni" visibile all'ospite non è un problema: l'ospite può leggere le segnalazioni approvate (`decisioni.md` sez. 5), quindi il filtro ha senso.

Problemi: 7 (P0: 0, P1: 4, P2: 2, P3: 1).

---

### [UX-01] Errore di caricamento del prontuario lascia il testo "Caricamento" per sempre
Gravità: P1
Flusso e schermo: H (Caricamento, errore API), schermata Cerca & Mappa, sezione "Schede Farmaci"
Passi: 1. Aprire la home con la risposta di `/api/medicines` bloccata o in errore (route abort). 2. Osservare il riepilogo sopra la griglia farmaci.
Prova: `H-1280-02.png` (verificato a vista): banner rosso "Failed to fetch" in alto, ma il riepilogo sotto "Schede Farmaci" mostra ancora "Caricamento prontuario farmaci in corso..." e la griglia è vuota. Codice: `public/index.html:172` (testo statico iniziale); `public/js/search-map.js:298-299` (`loadMedicines` non ha `try/catch`, quindi il riepilogo non viene mai aggiornato in caso di errore); `search-map.js:949-953` (l'errore finisce solo nel banner, in cima alla pagina).
Effetto sull'utente: l'utente non capisce se l'app sta ancora lavorando o si è guastata, e non trova un modo per riprovare (viola l'euristica 1, visibilità dello stato del sistema, e la 9, aiuto nel riconoscere e correggere gli errori). Il messaggio di banner, inoltre, sparisce allo scorrere.
Correzione minima: `public/js/search-map.js`, in `loadMedicines` (riga 298) avvolgere la chiamata in `try/catch` e in `catch` scrivere in `summaryEl` (`#medicine-results-summary`) un messaggio in italiano, ad esempio "Non riesco a caricare i farmaci. Controlla la connessione e riprova." con un pulsante "Riprova" che richiama `loadMedicines()`.

### [UX-02] Server spento: la ricerca mostra risultati vecchi come se fossero attuali
Gravità: P1
Flusso e schermo: H (server spento durante la sessione), schermata Cerca & Mappa, griglia farmaci
Passi: 1. Caricare la home e cercare "Omeprazolo" (riepilogo "Primi 60 di 8598 medicinali"). 2. Fermare il server. 3. Digitare un'altra ricerca o cambiare un filtro.
Prova: `H-1280-04.png` (verificato a vista): dopo l'errore di rete il riepilogo continua a dire "Primi 60 di 8598 medicinali" e le schede precedenti restano visibili, senza alcun messaggio. Codice: `public/js/search-map.js:849-851` (la ricerca digitata chiama `loadMedicines()` senza `catch`: l'errore diventa una promise rejection non gestita); `search-map.js:906-920` (i cambi di filtro Comune, tipo e raggio chiamano `loadPharmacies()` senza `catch`, quindi anche la lista presidi resta stantia).
Effetto sull'utente: l'utente può leggere prezzi o farmacie di una ricerca precedente pensando che siano quelli della ricerca attuale. In un'informazione sanitaria e di prezzo è un rischio di decisione sbagliata (viola l'euristica 1 e la chiarezza delle informazioni).
Correzione minima: `public/js/search-map.js`: aggiungere `catch` al listener di input (riga 850) e ai listener dei filtri (righe 855-858, 906-920, 915-919). In caso di errore svuotare `#medicine-results-grid` oppure marcare i risultati come "non aggiornati", e mostrare il messaggio nel riepilogo (stesso intervento di UX-01).

### [UX-03] La dicitura "Ricetta Medica Obbligatoria" è presentata come certa su ogni farmaco
Gravità: P1
Flusso e schermo: A e B (ricerca farmaci e filtro "Senza ricetta"), card farmaco e pulsante di ricerca farmacie
Passi: 1. Cercare "Paracetamolo" o "Omeprazolo". 2. Leggere il badge su ogni card. 3. Scegliere "Regime di dispensazione: Senza ricetta (SOP / OTC)".
Prova: in `public/js/search-map.js:428-429` ogni card mostra "Ricetta Medica Obbligatoria (RR)" oppure "Senza Ricetta (SOP / OTC)" a seconda di `prescription_required`. Il README, sezione 9 "Limiti noti", dichiara che tutti i farmaci risultano con obbligo di ricetta perché la lista non contiene l'informazione, e che il filtro "Senza ricetta" non trova risultati. Per la stessa ragione `public/index.html:147` offre l'opzione "Senza ricetta (SOP / OTC)" che produce solo "Nessun medicinale disponibile con i filtri selezionati" (`EVIDENCE.md`, flusso B, screenshot `B-1280-02.png`). Il pulsante `search-map.js:446-451` diventa "Trova Farmacie abilitate (richiede ricetta)" e `search-map.js:474` forza il filtro a sole farmacie.
Effetto sull'utente: l'interfaccia non segnala che il dato è incompleto. Un utente può credere che un farmaco da banco richieda la ricetta, o che il filtro sia rotto. Il limite dichiarato nel README non è reso visibile nell'interfaccia, quindi non rientra nell'eccezione "salvo che l'interfaccia li nasconda".
Correzione minima: `public/js/search-map.js:428-429` e `446-451`: mostrare "Regime non disponibile nel dataset" invece di un'affermazione certa, oppure nascondere il badge. In `public/index.html:147` disabilitare l'opzione "Senza ricetta" con la nota "Dato non disponibile in questo dataset", così il filtro non produce un vicolo cieco.

### [UX-04] Upload CSV con colonne errate segnalato come successo
Gravità: P1
Flusso e schermo: G (Area Admin, caricamento dataset)
Passi: 1. Accedere come admin. 2. In "Ingestione Dataset" scegliere "Presidi Sanitari", caricare un CSV con intestazioni sbagliate. 3. Leggere il risultato.
Prova: `EVIDENCE.md`, flusso G: il messaggio è "Dataset 'pharmacies' elaborato con successo!" con "Record scartati: 1" e "inseriti: 0". Codice: `public/js/admin.js:140-143` imposta sempre `resultBox.dataset.type = 'success'` e il titolo "elaborato con successo!" quando la risposta è 2xx, senza controllare `data.inserted`, `data.updated` o `data.skipped` (righe 151-153).
Effetto sull'utente: l'admin crede che il dataset sia stato aggiornato mentre nessun record è entrato. Con un dataset sanitario questo lascia dati vecchi in produzione senza che nessuno se ne accorga (euristica 1 e 9).
Correzione minima: `public/js/admin.js:140-143`: se `data.inserted + data.updated === 0` oppure `data.skipped > 0`, usare `dataset.type = 'warning'` (o 'error') e un titolo come "Nessun record importato: X scartati su Y", con la stessa riga di statistiche già presente.

### [UX-05] Messaggi di errore tecnici in inglese
Gravità: P2
Flusso e schermo: H (errore API, server spento)
Passi: 1. Bloccare `/api/...` o fermare il server. 2. Leggere il banner in cima alla pagina.
Prova: `H-1280-02.png` (verificato a vista): banner con il testo "Failed to fetch". Codice: `public/js/api.js:27` lascia propagare l'errore nativo di `fetch`, e `search-map.js:778` e `951` mostrano `err.message` così com'è.
Effetto sull'utente: il testo è in inglese e tecnico, quindi l'utente non capisce cosa fare (euristica 9, linguaggio e aiuto nel riconoscere gli errori). Nel contesto di un'app pubblica in italiano è un segnale di prodotto non finito.
Correzione minima: `public/js/api.js:27`: racchiudere `await fetch(...)` in `try/catch` e lanciare `new Error('Impossibile contattare il server. Controlla la connessione e riprova.')`.

### [UX-06] Errore del GPS mostrato in cima alla pagina, lontano dal pulsante "Usa GPS"
Gravità: P2
Flusso e schermo: D (distanza e raggio), sezione mappa
Passi: 1. Scorrere fino alla mappa. 2. Premere "Usa GPS" senza concedere il permesso.
Prova: il messaggio di errore passa da `public/js/search-map.js:799-803` a `api.js:36-41`, che scrive nel banner `#global-feedback`. Il banner è in `public/index.html:37`, in cima a `<main>`. Il pulsante è in `index.html:211`, nel blocco mappa, molto più in basso. Il contenitore già pensato per i messaggi della mappa, `#geocode-status-bar` (`index.html:250`, con `aria-live`), non viene usato per questo errore. Nota: il ramo di errore non è stato verificato con il browser (EVIDENCE, flusso D), quindi la prova è il codice.
Effetto sull'utente: l'utente preme il pulsante, non vede nulla vicino a sé e pensa che il GPS non risponda (euristica 1 e 2, corrispondenza con il mondo reale).
Correzione minima: `public/js/search-map.js:799-803`: scrivere il messaggio in `#geocode-status-bar` invece di `showFeedback`, e chiamare `bar.classList.remove('is-hidden')`.

### [UX-07] Target dell'attribuzione Leaflet sotto 24 px
Gravità: P3
Flusso e schermo: A e C (mappa), attribuzione in basso a destra
Passi: 1. Aprire la mappa. 2. Misurare il link "Leaflet" e "OpenStreetMap" nell'attribuzione.
Prova: `EVIDENCE.md`, flusso A: 2 controlli sotto 24 px, circa 14 px di altezza (misura del harness). Lo screenshot `H-1280-02.png` mostra l'attribuzione in basso a destra della mappa.
Effetto sull'utente: lieve difficoltà a toccare il link su mobile. È un problema minore, perché il criterio WCAG 2.2 2.5.8 ha un'eccezione per i target inline dentro un testo e l'attribuzione è una riga di testo.
Correzione minima: `public/css/style.css`: aggiungere per `.leaflet-control-attribution a` un `padding` verticale che porti l'area di tocco a 24 px, senza cambiare il testo.

---

## Note per la sintesi
- Problemi di priorità più alta: UX-01, UX-02 e UX-03 toccano la chiarezza delle informazioni sanitarie (stato di errore, dati stantii, regime di dispensazione). UX-04 riguarda la fiducia nei dati admin.
- Non verificato a vista: il ramo di errore del GPS (UX-06), la lista "Approvate/Rifiutate" e la resa mobile di ogni schermata (EVIDENCE, sezione "Copertura e limiti").
