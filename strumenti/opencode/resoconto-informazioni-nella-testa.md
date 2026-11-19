# Resoconto `informazioni-nella-testa`

## File toccati

- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Nessun altro file. Nessun commit, nessun `git stash/checkout/reset`, database, `.env`, Integra e porte non toccati.

## Diff sintetico

**`componenti/Pagina.tsx`**
- `PannelloProps`: nuova prop facoltativa `info?: ReactNode`.
- `Pannello`: `info` reso dentro `.pannello-destra` come **ultimo** elemento, dopo le `azioni` (l'«i» sempre all'estrema destra).
- Ordine finale: `{nota}` → pulsanti → `{info}`.

### Correzione 1 (Ugo, 18/11/2026)

Prima versione: `{nota}` → `{info}` → pulsanti. **Errato**: l'«i» deve stare sempre all'estrema destra.
Corretto in `{nota}` → pulsanti → `{info}` (unica modifica di questa correzione, solo `componenti/Pagina.tsx`).
`tsc --noEmit`: 0 errori.

**`VistaPratica.tsx` (scheda Riepilogo)**
- Pannello *Provvigione*: rimosso `<div className="strumenti-scheda"><span className="spazio" /><Informazioni …></div>` dal corpo; ora `info={<Informazioni titolo="Informazioni sulla provvigione">…}` sulla testata.
- Pannello *Documenti fiscali*: idem, `info={<Informazioni titolo="Informazioni sui documenti fiscali">…}`.
- Pannello *Documenti*: idem, `info={<Informazioni titolo="Informazioni sui documenti">…}`.
- Testi delle spiegazioni invariati; nessun'altra pagina o pannello toccato. Non resta nessun `strumenti-scheda` in `pratiche/**`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: **0 errori** (exit 0).
- Playwright non lanciato (come da pacchetto): le schermate le fa l'orchestratore.

## Dubbi

- Nessuno sul codice richiesto. Nota di forma: `.pannello-destra` ha `flex-wrap: wrap` e `gap: 10px`, quindi su testate strette (colonna destra del Riepilogo a 768 px) l'«i» va a capo insieme alle azioni, dove prima stava su una riga sua nel corpo: comportamento voluto dal pacchetto, da guardare nella schermata.
- Il pannello *Provvigione* nella vista di caricamento (`Sagoma`) non ha né nota né `info`: invariato, nessuna modifica necessaria.
- Possibile estensione futura: gli altri pannelli dell'app che mettono l'«i» a mano in `.pannello-destra` (es. `VistaAnalisi.tsx` ~riga 269) potrebbero passare a `info=`, ma il pacchetto li vieta: resta com'è.

## Da documentare

Testo pronto per spec §16.4 (componente `Pannello`), da inserire dall'orchestratore:

> **Pannello** — testata con titolo, `nota` (testo tenue), `azioni` (pulsanti piccoli secondari) e `info` (pulsante «i» che apre una finestra di spiegazione) sempre **per ultimo, all'estrema destra**. Il pulsante «i» sta nella testata, non su una riga del corpo: le note lunghe non occupano spazio nella pagina (§7.3, Pratica: Provvigione, Documenti fiscali, Documenti).
> *Perché*: i tre pannelli della Pratica avevano l'«i» su una riga propria sopra il contenuto, con uno spazio vuoto a sinistra; nella testata sta accanto agli altri comandi e non spezza il corpo (18/11/2026).

Guida (`guida.js`, argomento `pratiche`) e piano: **non serve modificare nulla** — nessun pulsante, finestra o testo nuovo; cambia solo la posizione di un pulsante già descritto. Se l'orchestratore vuole comunque una riga nella guida, basta nella sezione «da sapere» della Pratica: «Le «i» dei riquadri sono nella testata di ciascun riquadro, accanto al titolo».
