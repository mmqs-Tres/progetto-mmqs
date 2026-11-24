# Persona walkthrough: PharmaPuglia OpenCare

Nota di metodo: questa è una simulazione cognitiva qualitativa, non una prova statistica. Le ipotesi vanno validate con utenti reali. Il walkthrough è basato sulle prove in `review-ux/evidence/` (EVIDENCE.md, screenshot a 1280 e 375 px) e sul codice in `public/`. Non è stato usato il browser. Gli screenshot a 375 px sono full-page alti circa 9.575 px: le posizioni indicate sono stime leggibili dalle anteprime, non misure.

---

## Persona 1: Anna, 72 anni, pensionata

- **Situazione:** prende l'omeprazolo da anni, il medico le ha detto che esiste una versione più economica. Vuole sapere quanto risparmia e dove comprarla vicino a casa, a Lecce.
- **Dispositivo:** smartphone, 375 px. Legge con gli occhiali, usa poco le app.
- **Ricerca:** "omeprazolo generico Lecce prezzo".
- **Paura principale:** comprare la medicina sbagliata o una dose diversa da quella del medico.
- **Stile decisionale:** lento, cerca conferme, si fida dei nomi istituzionali (ASL, Ministero).

### Monologo (fase 0 e 1)
"Ok, c'è scritto Ricerca Farmaci Equivalenti AIFA. Bene, è una cosa seria. Vedo tre numeri in alto ma non so cosa siano. Cerco omeprazolo... Oddio, quante scritte piccole. Ma quanti omeprazolo ci sono? Ce ne sono tanti. Questo è da 20 mg? Non lo so. Il mio è da 20, glielo ho chiesto al dottore. Questo costa meno, ma è la stessa cosa? Mi sembra di no, non so."

### Monologo (fase 2, scroll sulle card)
"Ci sono le card con 'Equivalenti (3)'. Vedo 'Prezzo più basso della categoria' in verde, mi sembra buono. Ma il nome che c'è scritto non dice quanti milligrammi sono. Lo dice da qualche parte in alto questo avviso, lo leggo... 'dosaggio, forma e confezione possono essere diversi'. L'ho letto troppo in alto, adesso ho scrollato e non lo vedo più. Ok, vado avanti."

"Ricetta Medica Obbligatoria? Per l'omeprazolo? Ma io lo compro senza ricetta da sempre. Adesso mi viene il dubbio che devo andare dal medico. Provo il filtro 'Senza ricetta'... 'Nessun medicinale disponibile con i filtri selezionati.' Quindi non c'è niente? Il sito è rotto o sono io?"

### Monologo (fase 3, cerco dove comprarlo)
"Devo scorrere ancora. Tanto scorrere. Ecco la mappa. Sono quasi in fondo. Clicco 'Usa GPS'... non succede niente. Aspetto. Niente. Scrivo l'indirizzo, clicco 'Calcola distanza'. Se c'è un errore dove lo scrivono? Guardo in alto nella pagina... sono lontanissima. Non lo vedo. Ho ancora la pagina di prima aperta, forse è stato fatto qualcosa e non me ne sono accorta."

### Monologo (chiusura)
"Ho capito che l'omeprazolo generico costa meno e che ci sono le farmacie. Non sono sicura che il generico sia lo stesso dosaggio. E non so se devo la ricetta. Preferisco chiedere alla farmacia di persona, così almeno so con chi parlo."

### Analisi (Anna)
- Fiducia: 6/10. Il logo ASL e i dati ministeriali la rassicurano, ma la mancanza del dosaggio e la contraddizione sulla ricetta la frenano.
- Punto di abbandono: il filtro "Senza ricetta" che non trova nulla, sulle card con "Ricetta Obbligatoria".
- Momento più coinvolto: il blocco "Equivalenti" con "Prezzo più basso". È il motivo per cui è venuta.
- Contatto: no. Va in farmacia.

---

## Persona 2: Luca, 41 anni, operatore di moderazione (admin)

- **Situazione:** è un operatore dell'Area Admin. Deve moderare 20 segnalazioni in attesa e caricare un file di aggiornamento dei presidi.
- **Dispositivo:** portatile, 1280 px.
- **Paura principale:** approvare una segnalazione sbagliata che finisce pubblica, o credere di aver caricato dati che invece non sono entrati.
- **Stile decisionale:** veloce, controlla i contatori, si fida dei messaggi di conferma.

### Monologo (moderazione)
"Ok, il tab Area Admin è lì. Lista delle segnalazioni 'In attesa'. Non vedo quante ce ne sono, devo contarle a mano. Approvo la prima. Il banner di conferma... dov'è? Ah, è in cima alla pagina, io sono in fondo alla tabella. Il messaggio sparisce. La tabella diventa una scritta 'Caricamento segnalazioni in corso...' e la pagina salta. Riscrollo. Ok, la seconda. Stesso salto. Mi sta venendo il mal di testa."

### Monologo (upload)
"Carico il file dei presidi. Esito: 'Dataset elaborato con successo!'. Verde. Però: 'Record scartati: 1', 'Nuovi record inseriti: 0'. Quindi è successo o no? Ho caricato un file sbagliato e il sistema mi dice che è andato tutto bene. Se non guardo i numeri non me ne accorgo."

### Analisi (Luca)
- Fiducia: 5/10 nel sistema, perché il messaggio di esito non corrisponde ai numeri.
- Punto di abbandono: il ciclo approva, scorri, ricarica che fa saltare la pagina.
- Momento più coinvolto: la tabella con il filtro "In attesa" e i pulsanti Approva/Rifiuta sulla stessa riga.
- Contatto: non applicabile. Il rischio è la pubblicazione di dati sbagliati.

---

## Problemi

### [PER-01] Equivalenti mostrati senza dosaggio né forma, con il disclaimer lontano dalle card
Gravità: P0
Flusso e schermo: Cerca & Mappa, Ricerca Farmaci e Equivalenti, risultati (desktop e mobile).
Passi: 1) Cercare "Omeprazolo". 2) Guardare una card con "Equivalenti (N) · stesso principio attivo" e il badge verde "Risparmio fino a X" o "Prezzo più basso della categoria". 3) Scegliere l'equivalente più economico senza leggere il disclaimer, che sta sopra la griglia.
Prova: `public/js/search-map.js:391-392` mostra in ogni voce solo `commercial_name` e AIC, senza dose né forma. `public/js/search-map.js:381` e `:382` mostrano il risparmio come dato secco. `public/js/search-map.js:403` ("stesso principio attivo") non dice che dose e forma possono differire. Il disclaimer è solo in `public/index.html:174-176`, nella toolbar sopra la griglia. Dopo 9 card visibili (`search-map.js:21`) non è più in vista. La decisione del README (sezione 5 di decisioni.md: "l'interfaccia lo segnala") è soddisfatta solo in quel punto.
Effetto sull'utente: Anna può comprare un equivalente con dose diversa (es. 10 mg al posto di 20 mg) convinta che sia lo stesso prodotto, per risparmiare. È un errore terapeutico concreto.
Correzione minima: `public/js/search-map.js` riga 391-392: estrarre e mostrare la dose dal nome, oppure mostrare in ogni box equivalenti l'avviso "Dose e forma possono differire: verifica con il farmacista". In `public/css/style.css`, il testo di avviso va reso leggibile (vedi PER-08).

### [PER-02] Regime di dispensazione presentato come fatto per tutti i farmaci, filtro "Senza ricetta" vuoto
Gravità: P1
Flusso e schermo: Cerca & Mappa, card dei farmaci e filtro "Regime di dispensazione".
Passi: 1) Cercare "Omeprazolo". 2) Leggere il badge di ogni card. 3) Provare il filtro "Senza ricetta (SOP / OTC)".
Prova: `public/js/search-map.js:428-430` mostra "Ricetta Medica Obbligatoria (RR)" o "Senza Ricetta" in base al campo `prescription_required`. `public/js/search-map.js:446-451` cambia il pulsante in "Trova Farmacie abilitate (richiede ricetta)". `public/index.html:148` offre il filtro "Senza ricetta" come funzionante. README, sezione 9, dichiara che tutti i farmaci risultano con obbligo di ricetta e che il filtro non trova nulla. L'interfaccia non mostra questo limite. EVIDENCE.md, flusso B, conferma il filtro vuoto. Nota: il badge reale nei thumbnail non è leggibile, quindi la prova visiva del testo "Ricetta" resta da confermare a 1:1.
Effetto sull'utente: Anna crede che per l'omeprazolo serva la ricetta. Può rinviare l'acquisto o andare dal medico senza motivo. Il filtro che promette OTC non funziona.
Correzione minima: `public/js/search-map.js:428-430` e `:446-451`: se il dato non è affidabile, non mostrare il badge come fatto. Usare "Regime non verificato" e rimuovere il filtro "Senza ricetta" da `public/index.html:148` finché il dato non è corretto.

### [PER-03] Errore di rete lascia "Caricamento prontuario..." per sempre e non mostra i risultati stantii
Gravità: P1
Flusso e schermo: Cerca & Mappa, riepilogo sopra la griglia dei farmaci.
Passi: 1) Caricare la pagina. 2) Simulare un errore di rete o un server spento. 3) Cercare un farmaco.
Prova: `public/js/search-map.js:298` chiama `PharmaAPI.request` senza `catch` in `loadMedicines`. Il riepilogo (`public/index.html:172`) resta con il testo statico perché `renderMedicines` non viene mai eseguito. `public/js/api.js:27-31` rilancia l'errore grezzo. In `search-map.js:948-954` il `catch` copre solo il caricamento iniziale, e mostra il messaggio inglese "Failed to fetch". EVIDENCE.md, flusso H, conferma: `H-1280-02.png` (riepilogo permanente), `H-1280-04.png` (server spento: risultati vecchi con "Primi 60 di 8598" e nessun errore).
Effetto sull'utente: Anna pensa che il sito sia rotto e non sa se riprovare. Se il server cade durante la sessione, vede prezzi vecchi come se fossero attuali.
Correzione minima: `public/js/search-map.js:298-300`: aggiungere `try/catch` in `loadMedicines`. In caso di errore, sostituire il riepilogo con "Non riesco a caricare i farmaci. Riprova." e svuotare la griglia. Tradurre "Failed to fetch" in `public/js/api.js`.

### [PER-04] Esiti di GPS e geocodifica compaiono in cima alla pagina, lontano dal pulsante usato
Gravità: P1
Flusso e schermo: Cerca & Mappa, sezione mappa in fondo alla pagina (pulsanti "Usa GPS" e "Calcola distanza").
Passi: 1) Scorrere fino alla mappa. 2) Cliccare "Usa GPS" senza dare il permesso, oppure scrivere un indirizzo inesistente. 3) Cercare la risposta.
Prova: `public/js/search-map.js:782-807` (errore GPS) e `:759-780` (errore geocodifica) chiamano `showFeedback`, che scrive in `#global-feedback` (`public/js/api.js:35-41`). Quel banner è in cima a `public/index.html:37`, prima delle card di ricerca. Il pulsante "Usa GPS" è in `index.html:211`, nella sezione mappa. EVIDENCE.md, flusso D: "nessun feedback visibile". Il codice conferma che il messaggio esiste ma è fuori schermo. `search-map.js` non chiama mai `scrollIntoView` sul banner, a differenza di `reports-auth.js:70`.
Effetto sull'utente: Anna clicca e non succede nulla. Non sa se il GPS ha funzionato o se ha sbagliato. Non trova le farmacie vicine e non sa perché.
Correzione minima: `public/js/search-map.js:774-779` e `:800-804`: mostrare l'esito dentro `#geocode-status-bar` (`public/index.html:250`), che è vicino al pulsante e ha `role="status"`.

### [PER-05] Su mobile la risposta "dove comprarlo" arriva dopo circa 9 schermate di farmaci
Gravità: P1
Flusso e schermo: Cerca & Mappa, 375 px, ordine delle sezioni.
Passi: 1) Cercare "Omeprazolo" su smartphone. 2) Scorrere fino alla mappa e alla lista farmacie.
Prova: `public/index.html:40-280`: l'ordine è hero, distretto, farmaci, mappa. Le card dei farmaci sono visibili a gruppi di 9 (`public/js/search-map.js:21`, `:320-335`), ciascuna con il box equivalenti. Nello screenshot `review-ux/evidence/A-375-01.png` (full-page, 375x9575) la sezione "Mappa Interattiva" compare a circa 8.500 px dall'alto (stima sull'anteprima). Su `C-375-01.png` la mappa è in una posizione simile. La regola `style.css:1181-1197` non cambia l'ordine su mobile.
Effetto sull'utente: Anna si stanca di scorrere. Molte persone abbandonano prima di arrivare alle farmacie, e il bisogno principale ("dove compro") è l'ultimo.
Correzione minima: `public/index.html`: spostare la card "Inquadramento Comune → ASL" e un collegamento "Vai alle farmacie" sopra i risultati, oppure aggiungere un link di ancoraggio `#map-section-card` nell'hero. In `public/js/search-map.js:21` ridurre le card visibili su mobile, ad esempio a 3.

### [PER-06] Upload CSV con 0 record inseriti riportato come successo
Gravità: P1
Flusso e schermo: Area Admin, sezione 1 "Ingestione Dataset".
Passi: 1) Login come admin. 2) Caricare un CSV con colonne sbagliate. 3) Leggere l'esito.
Prova: `public/js/admin.js:140-158`: il titolo è sempre "Dataset ... elaborato con successo!" e la scheda è verde (`data-type="success"`), anche con `inserted: 0` e `skipped: 1`. EVIDENCE.md, flusso G: "elaborato con successo", "inseriti: 0", "scartati: 1" (riproducibile su `G-1280-02.png`, verificato a vista). Il README (Limiti noti) dichiara che le righe scartate non hanno motivo, ma l'interfaccia non lo dice.
Effetto sull'utente: Luca crede che i presidi siano aggiornati e gli utenti vedono dati vecchi. È un rischio di informazione errata per i cittadini.
Correzione minima: `public/js/admin.js:140-158`: se `data.inserted + data.updated === 0` o `data.skipped > 0`, cambiare titolo e stato in "Nessun record importato: N scartati" e usare `data-type="error"` o `warning`.

### [PER-07] Moderazione: la tabella si svuota ad ogni azione, il banner resta in alto, nessun contatore
Gravità: P2
Flusso e schermo: Area Admin, sezione 2 "Moderazione Segnalazioni", desktop.
Passi: 1) Filtro "In attesa". 2) Approvare una segnalazione. 3) Ripetere per 20 segnalazioni.
Prova: `public/js/admin.js:225` sostituisce il contenuto della lista con "Caricamento segnalazioni in corso..." a ogni ricarica. Lo stesso avviene da `admin.js:371` dopo ogni `updateReportStatus`. Il banner di esito (`admin.js:365`) scrive in `#global-feedback`, in cima alla pagina (`public/index.html:37`). Nessun conteggio di segnalazioni in attesa in `admin.js:232-239`, a differenza di `reports-auth.js:449`, che mostra "Segnalazioni: N".
Effetto sull'utente: Luca perde il punto nella lista ad ogni clic, non sa quante segnalazioni restano, e non vede la conferma. Il rischio è approvare per errore la riga sbagliata.
Correzione minima: `public/js/admin.js:225`: non svuotare la lista, mostrare un indicatore sopra la tabella. `admin.js:232-239`: aggiungere "In attesa: N". `admin.js:365`: mostrare l'esito accanto alla tabella.

### [PER-08] Testi di supporto molto piccoli e lista equivalenti con scroll annidato
Gravità: P2
Flusso e schermo: Cerca & Mappa, card farmaci e box equivalenti, per un utente di 72 anni.
Passi: 1) Leggere le card su smartphone o portatile. 2) Leggere i dettagli AIC e titolare degli equivalenti. 3) Scorrere la lista equivalenti.
Prova: `public/css/style.css:353-357` (etichette KPI 0.76rem), `:533-537` (etichette distretto 0.74rem), `:727-730` (dettagli equivalenti 0.74rem), `:655-657` (meta farmaco 0.8rem), `:161-168` (badge 0.78rem). `:692-697`: la lista equivalenti ha `max-height: 13rem; overflow-y: auto`, quindi scorre dentro la pagina. Il testo base è 16px (`:37-41`), ma i dettagli critici (dose, AIC, avviso) sono sotto 13px.
Effetto sull'utente: Anna non legge i dettagli. Lo scroll annidato la fa perdere nella pagina, e il disclaimer del PER-01 è ancora più difficile da trovare.
Correzione minima: `public/css/style.css:727-730`: portare `.equivalent-info small` a 0.85rem e `:692-697`: rimuovere `max-height` oppure aumentarlo, eliminando lo scroll annidato.

### [PER-09] Il nome "Tachipirina" è promesso come esempio ma non esiste nei dati
Gravità: P2
Flusso e schermo: Cerca & Mappa, placeholder e chip "Esempi AIFA".
Passi: 1) Cliccare il chip "Tachipirina". 2) Leggere il messaggio.
Prova: `public/index.html:127` (placeholder "Es. Tachipirina...") e `:157` (chip). Il messaggio di assenza (`public/js/search-map.js:344`) suggerisce il principio attivo, quindi l'utente può recuperare. EVIDENCE.md, flusso B: il messaggio è chiaro. README, sezione 9, dichiara il limite dei farmaci. L'interfaccia però lo mostra come esempio funzionante.
Effetto sull'utente: Anna cerca il nome che conosce, non trova nulla e pensa che il farmaco non esista. Il messaggio suggerisce "Paracetamolo", ma lei non sa che è lo stesso principio attivo.
Correzione minima: `public/index.html:127` e `:157`: sostituire "Tachipirina" con un principio attivo presente (es. "Paracetamolo"), oppure mostrare nel messaggio "Il nome commerciale potrebbe non essere nel prontuario: cerca il principio attivo."

---

## Scartati

- Nessun problema sulla validazione dei campi della segnalazione: i messaggi nativi del browser sono in italiano e sono chiari.
- Limite di 60 farmaci e assenza di paginazione: dichiarati nel README e mostrati nel riepilogo ("Primi 60 di 212").
- Nessun limite ai tentativi di login e moderazione non verifica il testo modificato: limiti noti del README, non visibili come problemi di interfaccia.
- Attribuzione Leaflet di 14 px: non citata, perché il dato è dell'area mappa di terze parti e non impedisce il compito.
- Contrasto dei colori (`--text-secondary` su `--bg-page`): calcolato circa 6:1, supera AA.
- Tabella admin con `min-width: 860px` (`style.css:1135-1137`): problema reale solo sotto circa 900 px. Non è stato provato su mobile, quindi non è stato incluso.

---

## Verdetto sintetico

| Persona | Fiducia | Chiarezza | Pertinenza | Contatterebbe? |
|---|---|---|---|---|
| Anna (72, pensionata) | 6/10 | 6/10 | 7/10 | No, va in farmacia |
| Luca (admin) | 5/10 | 7/10 | 8/10 | Non applicabile |

Le due persone vedono problemi diversi. Anna è fermata dal rischio di dose sbagliata (PER-01) e dalla mancanza di risposta sul GPS (PER-04). Luca è fermato dal messaggio di esito che non corrisponde ai numeri (PER-06) e dalla lista che si svuota (PER-07).

---

## Conteggio per gravità

- P0: 1 (PER-01)
- P1: 5 (PER-02, PER-03, PER-04, PER-05, PER-06)
- P2: 3 (PER-07, PER-08, PER-09)
- P3: 0
