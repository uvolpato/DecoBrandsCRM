# Pacchetto `informazioni-nella-testa`

## Compito

Nella pagina **Pratica** (`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`, scheda *Riepilogo*), sposta i tre pulsanti «i» (`Informazioni`) dal corpo del pannello alla **testata del pannello**, dove stanno gli altri bottoni.

Casi (tutti nella stessa pagina):
1. Pannello **Provvigione** — oggi `<div className="strumenti-scheda"><span className="spazio" /><Informazioni titolo="Informazioni sulla provvigione">…` sopra le `Cifre`.
2. Pannello **Documenti fiscali** — `Informazioni titolo="Informazioni sui documenti fiscali"`.
3. Pannello **Documenti** — `Informazioni titolo="Informazioni sui documenti"`.

Lo scopo: il pulsante «i» deve stare nella riga della testata (`.pannello-destra`), non su una riga sua nel corpo.

## Come

- In `app/frontend/componenti/Pagina.tsx`, aggiungi a `PannelloProps` una prop facoltativa `info?: ReactNode` e rendila dentro `.pannello-destra`, **dopo** `pannello-nota` e **prima** delle `azioni`:
  `{nota}` → `{info}` → pulsanti. Stessa posizione già usata a mano in `VistaAnalisi.tsx` (~riga 269: nota e poi `Informazioni`).
- In `VistaPratica.tsx` togli i tre `<div className="strumenti-scheda"><span className="spazio" />…</div>` e passa `info={<Informazioni …>…</Informazioni>}` ai rispettivi `Pannello`.
- **Non cambiare il testo** delle spiegazioni. Non toccare altri pannelli né altre pagine.

## File ammessi

- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Vietati tutti gli altri: backend, CSS (`stile.css`), altre pagine, spec, guida, piano, prove. Niente commit, niente `.env`, porte 8001/8002, Integra, database.

## Vincoli

- V12: è solo interfaccia, nessun calcolo e nessuna chiamata nuova.
- Codice minimo (ponytail): riusa `Pannello` e `Informazioni`, niente componenti nuovi.
- Il working tree ha **già modifiche non committate** in `VistaPratica.tsx`: non fare `git stash`, `git checkout`, `git reset`; tocca solo le righe necessarie.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: le schermate le fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-informazioni-nella-testa.md` con: file toccati, diff sintetico, esito `tsc`, dubbi, e la sezione **Da documentare** (testo pronto per spec §16.4, guida e piano, se serve).
