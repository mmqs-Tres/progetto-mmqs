# EVIDENCE.md: raccolta prove Fase 1 (Evidence Collector)

## Ambiente e metodo
- App avviata da `npm run seed` e `npm start` con variabili di processo (DB temporaneo fuori dal repo, porta 3100). Il file `.env` non è stato letto. Il DB `data/pharmapuglia.db` non è stato aperto.
- Segreti (JWT_SECRET, password seed, password di prova) generati casualmente a runtime in un processo Playwright, mai scritti su file né riportati.
- Browser: Google Chrome di sistema via playwright-core (in scratchpad, fuori dal progetto). Viewport 1280x800 e 375x812 (mobile emulato). Reset del DB e nuovo seed prima di ogni viewport.
- Le CSP dell'app (`script-src 'self' https://unpkg.com`) bloccano l'eval delle stringhe: il harness usa `bypassCSP`, non l'app.
- Ogni schermata è full-page. Misure per flusso: overflow orizzontale (scrollWidth - clientWidth), altezza dei controlli visibili, ordine Tab (8 tasti per blocco), focus visibile (`:focus-visible` e outline).
- Dati di prova: utenti `.test` inventati, segnalazioni "Test QA ... (dato inventato)". File caricato: `data/raw/sample_pharmacies.csv`, più un CSV invalido in scratchpad.
- Post-run: server fermato, DB temporaneo eliminato.

## Esito sintetico

| Flusso | 1280 px | 375 px | Note |
|---|---|---|---|
| A Omeprazolo e equivalenti | OK | OK | Vedi note su paginazione e console 404 |
| B Nessun risultato e filtro Senza ricetta | OK | OK | Tachipirina non trovato (atteso) |
| C ASL e distretto di Lecce, farmacie | OK | OK | 54 presidi, tile caricate |
| D Distanza e raggio | OK | OK | Filtro 5 km: 1936 -> 122 presidi |
| E Registrazione, login errato, login, uscita | OK | OK | Errore login in italiano |
| F Crea, modifica, elimina segnalazione | OK | OK | Feedback di modifica generico |
| G Admin: moderazione e upload CSV | OK | OK | Upload CSV invalido segnalato come successo |
| H Caricamento, errore, vuoto, server spento | OK | OK | Errore API con testo tecnico; server spento senza messaggio |

Nessun flusso è rimasto NON PROVATO. Il geocoding Nominatim ha risposto HTTP 200, quindi D è stato eseguito davvero.

## Flusso A: cerca Omeprazolo e confronta equivalenti
- Passi: home con 61 card iniziali e KPI 8598 farmaci; ricerca "Omeprazolo" con riepilogo "Primi 60 di 212 medicinali"; blocchi "Equivalenti (N)" su 60 card, voci evidenziate come più economiche (es. "Prezzo più basso della categoria").
- Esito: OK entrambi i viewport. Screenshot: `A-1280-01.png`, `A-1280-02.png`, `A-375-01.png`, `A-375-02.png`.
- Console: un errore 404 "Failed to load resource" solo nella prima visita desktop; risorsa non identificata (possibile favicon, non verificato).
- Overflow: 0 px. Controlli sotto 24 px: 2 (link di attribuzione Leaflet, circa 14 px). Controlli tra 24 e 44 px: circa 3900 (quasi tutti nelle card dei farmaci; non ho scomposto il dato per tipo).
- Tab: Cerca farmaco -> filtro Tipologia -> filtro Regime -> chip rapidi, in ordine logico. Focus visibile: outline solid 2px su tutti.
- Osservazione: la ricerca restituisce 212 risultati ma ne mostra 60 con "Mostra altri"; corretto, non è un difetto.

## Flusso B: nessun risultato e filtro Senza ricetta
- Passi: "Tachipirina" -> "Nessun medicinale trovato per 'Tachipirina'. Prova con il principio attivo (es. Paracetamolo, Ibuprofene)." Filtro "Senza ricetta" con query vuota -> "Nessun medicinale disponibile con i filtri selezionati." Azzera filtri -> campi vuoti.
- Esito: OK. Il messaggio vuoto è chiaro e suggerisce alternative. Screenshot: `B-1280-01.png`, `B-1280-02.png`, `B-375-01.png`, `B-375-02.png`.
- Overflow 0. Tab coerente. Focus visibile.
- Nota: il filtro "Senza ricetta" non restituisce farmaci in questo dataset (nessuna card con "Con ricetta"). Non ho verificato se la combinazione è corretta; probabilmente non ci sono farmaci SOP con query vuota. Da verificare.

## Flusso C: ASL e distretto di Lecce, farmacie sulla mappa
- Passi: selezione Lecce e "Inquadra" -> "Lecce (LE)", Distretto DSS-LE-01, Azienda ASL LECCE, 54 presidi. "Mostra presidi di Lecce su mappa" -> badge "54 presidi", lista con 54 elementi.
- Esito: OK. Screenshot: `C-1280-01.png`, `C-1280-02.png` (verificato a vista: mappa con marcatori blu e verdi, lista presidi, box ASL), `C-375-01.png`, `C-375-02.png`.
- Overflow 0. Tile OpenStreetMap caricate (12 desktop, 6 mobile). Marcatori: il DOM non espone `.leaflet-marker-icon` (0), ma la mappa mostra i punti: probabilmente sono CircleMarker SVG. Non è un difetto.
- Tab: select tipo -> select raggio -> Reset mappa -> mappa -> zoom +/- -> attribuzione. Focus visibile.

## Flusso D: distanza da indirizzo e filtro per raggio
- Passi: "Via Sparano, Bari" -> HTTP 200 da `/api/geocode`, barra "Punto di riferimento attivo: Via Sparano da Bari ... (41.1237, 16.8695)". Raggio 5 km -> badge da "1936 presidi" a "122 presidi"; distanze 0.06 km, 0.11 km, ...
- Esito: OK. Screenshot: `D-1280-01.png`, `D-1280-02.png`, `D-375-01.png`, `D-375-02.png`.
- Pulsante "Usa GPS" senza permesso: la barra di stato non cambia e non compare messaggio di esito. Comportamento osservato: nessun feedback visibile (non ho verificato il ramo di errore del codice).
- Tab: Calcola distanza -> Usa GPS -> Comune -> Tipologia -> Raggio -> Reset -> Rimuovi posizione -> mappa. Focus visibile.

## Flusso E: registrazione, errore di login, login, uscita
- Passi: tab Segnalazioni da ospite (badge "Ospite"). Login con password errata -> "Email o password non corrette." (HTTP 401, atteso). Registrazione di `qa.evidence.<viewport>@pharmapuglia.test` -> "Accesso effettuato: Tester QA.", badge "Tester QA · Cittadino". Esci -> "Ospite". Login come cittadino di prova -> "Mario Rossi · Cittadino".
- Esito: OK. Screenshot: `E-1280-01.png` ... `E-1280-04.png`, `E-375-01.png` ... `E-375-04.png`.
- Console: 401 atteso su login errato, con stack trace nella console (logging solo sviluppo, da valutare).
- Tab dal form di accesso: password -> Accedi -> Non ho un account -> **filtro "Segnalazioni" (select reports-filter) anche da ospite**, con voci "Tutte / Turno / Disponibilità", poi l'uscita dal pannello. Osservazione: il filtro è visibile a un ospite che non può vedere le segnalazioni.
- Overflow 0. Controlli: il campo "Accedi" in alto a destra è alto 34 px (sotto 44 px, sopra 24 px).

## Flusso F: creare, modificare, eliminare una segnalazione
- Passi: form con Messaggio obbligatorio; invio vuoto -> validazione nativa del browser (`:invalid` sul campo). Creazione con categoria Turno, farmaco Omeprazolo -> "Segnalazione salvata: sarà pubblica dopo la moderazione." e voce in elenco. Modifica -> stesso messaggio "Segnalazione salvata: sarà pubblica dopo la moderazione.". Elimina con conferma del browser -> voce rimossa.
- Esito: OK. Screenshot: `F-1280-01.png` ... `F-1280-04.png`, `F-375-01.png` ... `F-375-04.png`.
- Osservazioni: 1) il messaggio dopo la modifica non distingue "modificata" da "creata" (copy generico). 2) I pulsanti Modifica/Elimina hanno `aria-label` "Modifica la segnalazione N": il nome accessibile inizia con il testo visibile (accettabile per WCAG 2.5.3), ma il testo è sostituito.
- Overflow 0. Controlli sotto 44 px: 16 (pulsanti delle card, circa 34 px).

## Flusso G: admin, moderazione e caricamento CSV
- Passi: uscita dal cittadino, accesso come admin -> badge "Amministratore Puglia · Admin", tab Area Admin visibile. Approva la segnalazione in attesa -> banner "Segnalazione #1 impostata su 'approved'." e rimozione dalla lista Pending. Filtro stato. Upload di `data/raw/sample_pharmacies.csv` (dataset Presidi) -> "Dataset 'pharmacies' elaborato con successo! Record aggiornati: 5, scartati: 0, totale 5". Upload di CSV con colonne errate -> ancora "elaborato con successo!" con "Record scartati: 1" e "inseriti: 0".
- Esito: OK funzionale, con un difetto di feedback (vedi sotto). Screenshot: `G-1280-01.png` ... `G-1280-04.png`, `G-375-01.png` ... `G-375-04.png`. Verificato a vista `G-1280-02.png`.
- Difetto (Medio): un file con colonne errate viene riportato come "successo". L'utente non capisce che nessun record è stato inserito.
- Nota: dopo l'approvazione la lista Pending è vuota e l'admin non vede un'etichetta "Pubblicata" nel contenitore; l'etichetta reale è nel banner. Non ho verificato la lista "Approvate".
- Overflow 0. Controlli: "Scegli file" e "Carica ed Elabora" non sono sotto 24 px.

## Flusso H: caricamento, errore, vuoto, server spento
- Caricamento (risposta ritardata 4 s): la pagina mostra "Caricamento prontuario farmaci in corso..." come testo statico, nessuno spinner. Screenshot: `H-1280-01.png`, `H-375-01.png`.
- Errore API (route abort): banner "Failed to fetch" (testo tecnico inglese, non in italiano). **Il riepilogo resta "Caricamento prontuario farmaci in corso..." per sempre** e la griglia è vuota. Screenshot: `H-1280-02.png` (verificato a vista), `H-375-02.png`.
- Vuoto: "Nessun medicinale trovato per 'zzqxnonesiste'..." e "Nessun farmaco corrisponde ai criteri di ricerca impostati." Screenshot: `H-1280-03.png`, `H-375-03.png`. OK.
- Server spento durante la sessione: la ricerca "Omeprazolo" fallisce (richiesta ERR_CONNECTION_REFUSED), ma **la pagina non mostra alcun messaggio di errore**: resta il riepilogo "Primi 60 di 8598 medicinali" con i risultati precedenti (stato stantio). Screenshot: `H-1280-04.png` (verificato a vista), `H-375-04.png`.
- Ricaricamento con server spento: errore del browser `net::ERR_CONNECTION_REFUSED`, atteso e fuori dall'app. Screenshot: `H-1280-05.png`, `H-375-05.png`.
- Difetti: 1) **Medio**: stato di errore non gestito nel riepilogo, testo di caricamento fisso. 2) **Medio**: nessun messaggio quando il backend è fermo, con risultati stantii. 3) **Basso**: messaggio "Failed to fetch" in inglese e tecnico.

## Riepilogo dei difetti riproducibili (in ordine di priorità)
1. **Medio (H)**: errore API lascia "Caricamento prontuario farmaci in corso..." permanente. Prova: `H-1280-02.png`.
2. **Medio (H)**: server spento, la ricerca non mostra errore e lascia i risultati precedenti. Prova: `H-1280-04.png`.
3. **Medio (G)**: upload di CSV con colonne errate riportato come successo ("elaborato con successo", 0 inseriti, 1 scartato). Prova: testo in `G-*` steps.
4. **Basso (H)**: messaggi tecnici in inglese ("Failed to fetch").
5. **Basso (E)**: filtro "Segnalazioni" visibile anche da ospite.
6. **Basso (F)**: messaggio di esito identico per creazione e modifica.
7. **Basso (C/A)**: attribuzione Leaflet con link di 14 px (sotto 24 px, criterio WCAG 2.2 AA 2.5.8).
8. **Basso (D)**: "Usa GPS" senza esito visibile (non ho verificato il ramo di permesso negato).

## Controlli trasversali
- Overflow orizzontale: 0 px in tutte le misure a 1280 e 375 px.
- Focus visibile: outline solid 2px sugli elementi raggiunti da Tab. Il ritorno al `body` dopo l'ultimo controllo del pannello è il comportamento standard del browser.
- Controlli sotto 24 px: solo i link di attribuzione Leaflet (2). Sotto 44 px: molti (vedi flussi), coerenti con un design denso; criterio AAA non obbligatorio.
- Console: 401 atteso su login errato; 404 non identificato in A desktop; `ERR_FAILED` e `ERR_CONNECTION_REFUSED` solo nei test di H.

## Copertura e limiti
- Tutti i flussi A-H eseguiti su entrambi i viewport. Mobile verificato con metriche (overflow, dimensioni), non con revisione visiva di ogni schermata.
- Non verificati: ramo di errore del GPS, lista "Approvate" e "Rifiutate", modifica con stato cambiato, accessibilità con screen reader, contrasto colori, Tab nel menu mobile (non esiste un menu hamburger in questa versione).
- Sessione in sandbox: Nominatim e tile OSM sono risultati raggiungibili.

**Screenshot**: `review-ux/evidence/` (50 file PNG, nomi `<flusso>-<larghezza>-<nn>.png`).
