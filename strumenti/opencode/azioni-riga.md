# Azioni sulle righe delle tabelle: sempre icone, in colonne fisse (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P2 · **Regola di progetto** (D-171): vale per tutte le tabelle dell'app, oggi e domani.

Prima leggi i resoconti di `percentuali-riprogetto` (icone Modifica/Elimina sugli scaglioni), `link-diretti` e `numero-ordine-fornitore`: modifiche non committate negli stessi file. Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Regola di Ugo
«Sulle righe i bottoni vanno sempre così»: nelle tabelle (`DataTable` e ogni tabella con azioni per riga) le azioni della riga sono **icone**, non pulsanti con testo, e **ogni icona sta nella sua colonna fissa**: l'icona «Modifica» è sempre nello stesso punto in tutte le righe, «Elimina» sempre nel suo; **se una riga non ha quell'azione resta lo spazio vuoto** (le altre non scorrono). Esempio: Clienti → AGRI AGGIO → scheda Agenzie: oggi «Conferma / Modifica / Elimina» sono pulsanti impilati di larghezza diversa, la riga è alta e la tabella ha la barra di scorrimento orizzontale.

## Da fare
1. **Componente unico** (nel componente tabella esistente o un `AzioniRiga` in `app/frontend/componenti/`, riusa quello che c'è per `percentuali-riprogetto`): la tabella riceve l'elenco delle azioni possibili della tabella (ordine e icona fissi, es. Conferma ✓, Modifica ✎, Elimina 🗑 con le icone dell'app `Icona`), e per ogni riga quali sono attive/visibili. Colonna stretta a destra, larghezza = n. azioni × slot fisso, slot vuoto se l'azione manca, azione non permessa = slot vuoto (o icona spenta con il motivo nel `title` se oggi è così: mantieni il comportamento attuale dei permessi). `aria-label` e `title` con azione + oggetto («Modifica l'agenzia ARTE…»), fuoco con bordo interno (D-64), area di clic ≥ 32 px. Elimina in rosso tenue, Conferma in evidenza (primario) ma sempre icona.
2. **Applicalo a tutte le tabelle con azioni per riga** dell'app (cerca pulsanti dentro le celle: `btn` nelle colonne delle `DataTable`): Agenzie del cliente, scaglioni, eccezioni, utenti, subagenti, documenti, scartati, registro, ecc. Elenco nel resoconto.
3. Niente più scorrimento orizzontale causato dalle azioni (Agenzie a 1440 e 768).
4. Nel catalogo dei componenti (`app/frontend/app/(app)/componenti/page.tsx`) un esempio con righe che hanno azioni diverse (slot vuoti visibili).
5. In Agenzie la colonna Periodo mostra `2000-01-01`: se il pacchetto `link-diretti` non l'ha già sistemato, data in gg/mm/aaaa (e «da sempre» per 01/01/2000 se è la data dell'import del vecchio CRM D-158).

## File ammessi
`app/frontend/**`, `strumenti/prove/app_*.py` (selettori che cambiano: i pulsanti diventano icone con `aria-label`), il resoconto `strumenti/opencode/resoconto-azioni-riga.md`. Non `app/backend/**`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_clienti app_fornitori app_utenti app_subagenti app_scartati app_componenti app_documenti` (timeout 10 min per comando, anche a gruppi), 0 KO. Controllo nuovo: in Agenzie le icone «Modifica» di righe diverse hanno la stessa `x` (±1 px) anche se una riga ha «Conferma» e l'altra no; nessuno scorrimento orizzontale.
- Schermate di Agenzie a 1440 e 768 in `strumenti/collaudo/e2e/uscita/azioni-riga-*.png`: guardale.
- Carica davvero `ponytail-review`, `accessibility`, `ui-ux-pro-max`, `caveman`.
- Resoconto con «Da documentare» (§16.4 componente, §16.4.1 regola delle tabelle, §19 D-171).
