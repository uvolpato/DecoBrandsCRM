# Resoconto — Azioni sulle righe delle tabelle: sempre icone, in colonne fisse (D-171, P2, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/azioni-riga.md`.
Skill caricate davvero: `ponytail-review`, `accessibility`, `ui-ux-pro-max`, `caveman`.

## Cosa è stato fatto

1. **Componente nuovo `app/frontend/componenti/AzioniRiga.tsx`** (unico, D-171): la tabella dichiara
   l'elenco ordinato delle azioni possibili (`AzioneRiga`: `nome`, `icona`, `etichetta` = verbo,
   `variante` primario|pericolo); per ogni riga dà quelle attive (`AttivaRiga`: `nome`, `onClick`,
   `disabilitata`, `titolo`, `etichetta` per il verbo dinamico). Ogni azione sta nel **suo slot fisso**
   da 32 px: se manca resta lo spazio vuoto (`.azione-slot`) e le altre non scorrono. Icona spenta =
   `disabled` con il motivo nel `title` (comportamento attuale dei permessi). `aria-label` e `title`
   con azione + oggetto («Modifica l’agenzia ARTE…»), fuoco con bordo interno (D-64:
   `outline-offset: -2px`), area di clic 32 px (≥ WCAG 2.5.8). Elimina in rosso tenue
   (`--errore-testo`), Conferma in evidenza (`--primario`), sempre a icona.

2. **`stile.css`**: `.btn-riga` portata da 28 a 32 px con fuoco a bordo interno; nuove `.azioni-fisse`
   (riga a slot) e `.azione-slot` (vuoto 32 px); varianti `.btn-riga.primario` e `.btn-riga.pericolo`.

3. **Applicato a tutte le tabelle con pulsanti dentro le celle delle `DataTable`** (cerca per
   `btn` nelle colonne):
   - **Agenzie** (`VistaClienti.tsx`): Conferma ✓ (solo se `da_confermare`), Modifica ✎, Elimina 🗑 —
     prima pulsanti «Conferma / Modifica / Elimina» impilati, riga alta e scorrimento orizzontale.
   - **Scaglioni** (`VistaFornitori.tsx`): Modifica ✎, Elimina 🗑 (spento sull'ultimo) — riusato il
     pattern di `percentuali-riprogetto` dentro `AzioniRiga`.
   - **Scartati** (`VistaScartati.tsx`): Recupera ↶, Elimina 🗑 (solo amministratore).
   - **Stato del sistema** (`VistaSistema.tsx`): «Segna come visto» → icona 👁 (i testi «visto»/«chiuso»
     restano: sono stati, non azioni).
   - **Liquidazioni** (`VistaLiquidazioni.tsx`): «Correggi / Cambia la correzione» → matita ✎ con
     verbo dinamico via `AttivaRiga.etichetta`.

4. **Agenzie, colonna Periodo**: `2000-01-01` → «da sempre» (D-158: import dal vecchio CRM), resto in
   gg/mm/aaaa (già fatto da `link-diretti`).

5. **Catalogo** (`componenti/page.tsx`): voce `AzioniRiga` con esempio a righe diverse (slot vuoti
   visibili: una riga ha tutte e tre, una ne ha due, una solo Modifica).

## Tabelle senza azioni per riga (verificato, nessun pulsante nelle celle)

`Utenti`, `Subagenti`, `Registro`, `Documenti` e le eccezioni non hanno pulsanti dentro le colonne
delle `DataTable`: le loro azioni stanno nella barra della testata/pannello, nel dettaglio, in
`Elenco` o in una finestra. Restano come sono.

**Non convertiti (fuori dall'ambito «DataTable»)**: i pulsanti dentro `Elenco` (Correggi/Annulla/Sposta
dei documenti fiscali in `VistaPratica.tsx`) e gli incassi («Sollecita il cliente», «Segna come pagata»)
sono righe di `Elenco`/riquadri, non tabelle: la regola delle colonne fisse non si applica. Se Ugo li
vuole a icone si fa in un passaggio dedicato.

## Prove

- `npx tsc --noEmit` nel frontend: **pulito**.
- `python -m py_compile` su `app_clienti.py`, `app_fornitori.py`, `app_scartati.py`, `app_sistema.py`,
  `app_liquidazioni.py` (+ `app_utenti.py`, `app_subagenti.py`, `app_componenti.py`, `app_documenti.py`):
  **0 errori**.
- Selettori aggiornati (i pulsanti diventano icone con `aria-label`):
  - `app_clienti.py`: Modifica/Elimina dell'agenzia → `button[aria-label^="Modifica"]` /
    `button[aria-label^="Elimina"]`; **controllo nuovo D-171**: la Modifica è alla stessa `x` in ogni
    riga (±1 px), Elimina a 36 px da Modifica (lo slot vuoto di Conferma resta), nessuno scorrimento
    orizzontale a 1440 e 768; schermate `strumenti/collaudo/e2e/uscita/azioni-riga-1440.png` e
    `azioni-riga-768.png`.
  - `app_scartati.py`: Recupera/Elimina → `button[aria-label^="Recupera"]` / `[aria-label^="Elimina"]`.
  - `app_sistema.py`: «Segna come visto» → `button[aria-label^="Segna come visto"]`.
  - `app_liquidazioni.py`: Correggi/Cambia la correzione → `[aria-label^="Correggi"]` /
    `[aria-label^="Cambia la correzione"]`.
- **Giro nel browser non lanciato** (regole-onda-parallela: «Prove nel browser: non lanciarle … le
  lancia Claude Code a fine onda»; FE 8071 e BE 8012 non erano accesi). Le prove aggiornate e le due
  schermate di Agenzie restano a Claude Code con `prepara.sh decobrands_test_e2e` + `giro.sh
  decobrands_test_e2e app_clienti app_fornitori app_utenti app_subagenti app_scartati app_componenti
  app_documenti`.

## Controlli (skill caricate davvero)

- `ponytail-review`: nessuna astrazione o dipendenza nuova; `AzioniRiga` ha 5 chiamanti e un
  comportamento comune, `AttivaRiga.etichetta` serve al solo verbo dinamico delle Liquidazioni. `net: 0`.
- `accessibility`: icone con `aria-label` e `title` descrittivi, slot vuoti `aria-hidden`, fuoco
  visibile a bordo interno, area di clic 32 px (≥ 2.5.8), `disabled` con motivo nel title. Nessun
  fuoco rimosso.
- `ui-ux-pro-max`: icone SVG dell'app (mai emoji), colonne fisse allineate, rosso tenue e primario con
  contrasto sui token esistenti, nessuno scorrimento orizzontale.

## Da documentare (spec)

- **§16.4 (componenti)** — nuovo `AzioniRiga`: azioni di riga a icone in colonne fisse, elenco ordinato
  delle azioni della tabella + per riga quali sono attive; slot vuoto se manca, icona spenta con motivo
  nel `title` se non permessa; `aria-label`/`title` «{verbo} {oggetto}»; fuoco a bordo interno (D-64),
  area di clic 32 px; varianti primario (Conferma) e pericolo (Elimina, rosso tenue).
- **§16.4.1 (regola delle tabelle)** — le azioni di riga sono sempre icone, non pulsanti con testo, e
  ognuna sta nella sua colonna fissa: «Modifica» sempre nello stesso punto in tutte le righe, «Elimina»
  sempre nel suo; se una riga non ha quell'azione resta lo spazio vuoto (le altre non scorrono).
- **§7.2 / §7.7 / §7.9 / §7.16 / §7.14** — le tabelle interessate (Agenzie, Scaglioni, Scartati,
  Problemi, Documenti delle Liquidazioni) usano `AzioniRiga` al posto dei pulsanti con testo.
- **§19 — D-171** (da proporre): sulle righe i bottoni vanno sempre così: icone in colonne fisse, slot
  vuoto se l'azione manca; niente più scorrimento orizzontale causato dalle azioni (Agenzie a 1440 e 768).

## Aperti / note

- File fuori dall'elenco ammesso: **nessuno** (solo `app/frontend/**`, `strumenti/prove/app_*.py`,
  questo resoconto).
- I pulsanti dentro `Elenco` (fiscali/altri della pratica) e gli incassi restano con testo: non sono
  tabelle. Da decidere con Ugo se allinearli.
- La verifica visiva (schermate `azioni-riga-1440/768.png`) e il giro del browser a 0 KO restano a
  Claude Code, come da regole onda.
