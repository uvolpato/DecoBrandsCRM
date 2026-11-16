# Resoconto — Conferma con spunta per le operazioni senza ritorno + «Rileggi il documento» come pulsante (D-172) (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/conferma-con-spunta.md` (P1, regola di progetto D-172). Parte dopo `numero-ordine-fornitore`, `azioni-riga`, `affiancati-righe`, `link-diretti` (modifiche non committate negli stessi file). Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto, niente `decobrands_db`, niente 8001/8002, niente Integra, niente commit.

## Cosa è stato fatto

### 1. Componente nuovo `ConfermaGrave` (`app/frontend/componenti/ConfermaGrave.tsx`)
Come `Conferma` ma con una **casella da spuntare** che abilita il pulsante rosso (D-172): titolo, elenco puntato delle conseguenze (`punti: ReactNode[]`), testo della casella (`etichettaCasella`, default «Ho capito, procedi»), pulsante `pericolo` **spento finché non è spuntata**, `annulla`. Riusa `Modale` (Esc annulla, clic sul velo annulla). Il fuoco iniziale cade sulla casella (primo `input` del corpo). Il server non cambia: è solo interfaccia.

### 2. FormModal con `casella`
Nuova prop `casella?: string` in `FormModal`: con questa etichetta il modulo mostra la casella e il pulsante di conferma resta spento finché non è spuntata (serve a *Scarta il documento*, che ha un modulo con motivo e nota).

### 3. «Rileggi il documento» (punto 1)
- **Tolto** dalla testata di *Correggi i dati letti* (il link sopra «Ordine fornitore»): ora lì resta solo «Ricava dal testo» (quando c'è `lettura_grezza`).
- Diventa un **pulsante nel piede** della finestra, a sinistra (lontano da «Salva e ricalcola l'abbinamento»), e **lo stesso pulsante** nell'intestazione del documento: entrambi aprono `ConfermaRileggi` (la `ConfermaGrave` con le conseguenze vere).
- Conseguenze scritte leggendo `documenti.ts`/`lettura.ts`: il documento torna `in_coda` con `tentativi=0` e il lettore lo riprende (un documento ogni 15 s); **tutti i campi letti vengono riscritti**, comprese le correzioni a mano (quelle non salvate si perdono); fornitore, cliente e abbinamento si riconoscono di nuovo. Non ho scritto «consuma un credito» perché non è vero: un errore del servizio non consuma il tentativo.

### 4. Testata di *Correggi i dati letti* (punto 1b)
CSS `.riga-letti.tipo` a 5 colonne: Tipo e Data larghi quanto il contenuto (`auto` + `min-width: max-content` su select/data), Numero e Ordine fornitore prendono il resto (`1fr`), Importo `1fr`. A 768 la riga va a capo su due righe ordinate (3 colonne). Il campo «Ordine fornitore» non è più coperto (il link è tolto).

### 5. D-172 applicato (conferma con spunta)
| Operazione | Dove |
|---|---|
| Rileggi il documento | VistaDocumento (intestazione + piede Correggi) |
| Scarta il documento | VistaDocumento (`FormModal` con `casella`) |
| Togli dalla coda | VistaDocumento |
| Elimina agenzia | VistaClienti |
| Elimina scaglione / versione percentuali | VistaFornitori |
| Elimina subagente / eccezione | VistaSubagenti |
| Elimina utente | VistaUtenti |
| Elimina definitivo negli Scartati | VistaScartati |
| Chiusura bollettino (verificato/contestato) | VistaBollettino |
| Chiusura liquidazione | VistaLiquidazioni |
| Annulla documento (fattura/nota di credito) | VistaPratica |

Le conferme leggere (azioni reversibili) restano com'erano.

### 6. AzioniRiga negli elenchi non DataTable (punto 2b, D-171)
In `VistaPratica` i pulsanti di testo nelle righe di `Elenco` (fiscali: Correggi/Annulla/Sposta; altri: Sposta) e degli **incassi** (Sollecita/Segna come pagata/Segna come non pagata) diventano `AzioniRiga` a icone in slot fissi. L'azione «Annulla» (senza ritorno) usa la conferma con spunta. Aggiunta icona `sposta` in `Icona.tsx`.

## Prove

- `npx tsc --noEmit` nel frontend: **pulito**.
- `python -m py_compile` su `app_documenti.py`, `app_clienti.py`, `app_fornitori.py`, `app_scartati.py`, `app_subagenti.py`, `app_bollettino.py`, `app_flusso.py`, `app_liquidazioni.py`, `app_eventi.py`, `app_pratica.py`, `app_utenti.py`: **0 errori**.
- Prove aggiornate: le conferme spuntano la casella (`.casella-grave input`) prima di confermare; controllo nuovo «Rileggi» apre la conferma e il pulsante è spento finché non si spunta; selettori `button[aria-label^="…"]` al posto dei pulsanti di testo (Annulla/Sposta/incassi). La liquidazione verifica importo e subagenti nel corpo della conferma (non più nel titolo).
- **Giro nel browser non lanciato**: il frontend di prova (8071) e il backend di prova (8012) non sono accesi e, come da `regole-onda-parallela.md`, non tocco la copia del frontend fuori dal progetto né avvio i server. `prepara.sh decobrands_test_e2e` + `giro.sh decobrands_test_e2e app_documenti app_clienti app_fornitori app_scartati app_subagenti app_bollettino app_flusso app_liquidazioni app_eventi app_pratica app_utenti` restano a Claude Code, con le schermate a 1440 e 768 della testata di Correggi da guardare.

## Controlli (skill caricate davvero)

- `ponytail-review`: un solo componente nuovo (`ConfermaGrave`) con molti chiamanti e comportamento comune; `casella` in `FormModal` è una prop opzionale di 8 righe; nessuna astrazione o dipendenza nuova. `net: 0`.
- `accessibility`: casella con `<label>` cliccabile e `:focus-within`, fuoco iniziale sulla casella (primo `input` del corpo), pulsante `disabled` finché non è spuntata (Invio non conferma), Esc annulla (Modale). Guardato anche l'Esc di `FinestraCorreggi`: ora non chiude più la finestra intera quando c'è sopra una conferma.
- `ui-ux-pro-max` (al posto di `design:ux-copy`, non installata): pulsante rosso spento/accesso, casella con bordo che si accende al fuoco, icone SVG (mai emoji), nessun testo tagliato nella testata a 1440.
- `caveman`: risposte concise.

## Da documentare (spec)

- **§16.4 (componenti)** — nuovo `ConfermaGrave` (titolo, elenco puntato delle conseguenze, casella che abilita il pulsante rosso; `annulla`, `onRisposta`); `FormModal` accetta `casella` per lo stesso comportamento nei moduli.
- **§16.4.1 (regola)** — D-172: ogni operazione impattante e senza ritorno usa la conferma con casella; le conferme leggere (reversibili) restano.
- **§7.9 / §6.5 (documento)** — «Rileggi il documento» è un pulsante nel piede di *Correggi i dati letti* (a sinistra) e nell'intestazione, con la conferma con casella che elenca le conseguenze; il link sopra «Ordine fornitore» è tolto.
- **§7.3 (pratica)** — le azioni sugli elenchi (documenti fiscali, altri, incassi) sono a icone in slot fissi (D-171); «Annulla» usa la conferma con casella.
- **§19 — D-172** (da proporre): regola standard delle conferme con casella per le operazioni senza ritorno; il server non cambia.

## Aperti / note

- **File fuori dall'elenco ammesso** (richiesti dal lavoro): `componenti/Icona.tsx` (icona `sposta`) e `componenti/FormModal.tsx` (prop `casella`). Da tenere presenti se altri pacchetti li toccano in parallelo.
- **Casi dubbi lasciati con conferma leggera** (da far decidere a Ugo): «Togli la correzione» (Liquidazioni, reversibile), «Reimposta la password» (Utenti, la vecchia smette di funzionare), «Termina eccezione»/«Cambia la percentuale» (Subagenti, cambi datati), «Disattiva soggetto/recapito» (Soggetti, nessuna cancellazione).
- **«Svuota» negli Scartati**: non esiste un'azione di svuotamento massivo, solo l'eliminazione per riga (convertita). Da confermare con Ugo se serve un «svuota tutto».
- La verifica visiva della testata (1440/768) e il giro del browser a 0 KO restano a Claude Code, come da regole onda.
