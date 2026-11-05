# Proposta di Progetto: PharmaPuglia OpenCare

## Tema

**Salute e Territorio**

## Dati o API

Il progetto integra e incrocia le seguenti fonti dati ufficiali suggerite nel laboratorio:

1. **Ministero della Salute**: Dataset Open Data su *Farmacie* e *Parafarmacie*.

2. **AIFA (Agenzia Italiana del Farmaco)**: Dataset ufficiale dei *Medicinali* autorizzati in commercio.

3. **Open Data Regione Puglia**: Dati georeferenziati su distretti sociosanitari e suddivisioni territoriali comunali/ASL.

4. **API Esterna (OpenStreetMap / Nominatim API)**: Servizio pubblico per geocoding, calcolo delle distanze e visualizzazione cartografica interattiva dei presidi sul territorio.

## Tre funzionalità minime

In conformità con i vincoli di progetto (autenticazione RBAC a due ruoli, database relazionale, operazioni CRUD, upload dataset e form con input utente):

1. **Ricerca Avanzata Farmaci & Matching Equivalenti (Ruolo: Cittadino/Ospite):**

   * Ricerca testuale per nome commerciale o principio attivo.

   * Visualizzazione immediata della scheda tecnica del farmaco e dell'elenco dei relativi farmaci generici/equivalenti a minor costo (dati AIFA), con associazione alle farmacie del territorio pugliese più vicine abilitate alla dispensazione.

2. **Segnalazioni Utente e Feedback sulla Disponibilità (Ruolo: Cittadino autenticato):**

   * Form interattivo a testo libero per consentire ai cittadini di inserire segnalazioni o note informative (es. farmacia di turno con sportello notturno attivo, disponibilità di farmaci a distribuzione per conto o disservizi temporanei).

   * Operazioni CRUD complete per l'utente sulle proprie segnalazioni (creazione, lettura, modifica, cancellazione).

3. **Dashboard di Ingestione Dati e Moderazione Sanitaria (Ruolo: Admin/Operatore Sanitario):**

   * Modulo di upload file (CSV/JSON) per caricare e aggiornare periodicamente i dataset ministeriali (AIFA e Min. Salute) all'interno del database relazionale tramite validazione dei dati.

   * Pannello di moderazione per revisionare, approvare o rimuovere le segnalazioni a testo libero inserite dagli utenti prima della pubblicazione pubblica.

## Perché mi piace

* è un’applicazione socialmente utile, permette ai cittadini di individuare rapidamente medicinali generici equivalenti e trovare farmacie/parafarmacie (o in generale i presidi sanitari indicati nei dataset) aperte nella propria zona.

* **Valore nel portfolio**: Penso che questo progetto possa andare ben oltre l’aspetto accademico, le capacità richieste per la realizzazione di questo software possono essere utili nel mondo del lavoro e soprattutto per poter avere una possibilità di essere notati da soggetti esterni.