# Pacchetto `informazioni-nei-pannelli-profilo` (frontend)

## Compito

Ugo (18/11/2026): l'«i» (`Informazioni`) deve stare nella **testata** dei pannelli, all'estrema destra dopo i pulsanti, non su una riga del corpo.

Nella pagina **Profilo** (`app/frontend/app/(app)/profilo/page.tsx`) ci sono tre `Informazioni` dentro `<div className="strumenti-scheda"><span className="spazio" />…</div>` nel corpo di un `Pannello` (~righe 44, 52, 69: «Aree che puoi aprire», «Pagina di ingresso per area», «Sicurezza»).

## Come

Per ognuno dei tre: togli il `<div className="strumenti-scheda">…</div>` dal corpo e passa `info={<Informazioni …>…</Informazioni>}` al `Pannello` corrispondente. La prop `info` esiste già in `componenti/Pagina.tsx` e mette l'«i» come ultimo elemento di `.pannello-destra` (dopo nota e pulsanti).

Testi invariati. Nient'altro: nessuna altra pagina, nessun CSS.

## File ammessi

- `app/frontend/app/(app)/profilo/page.tsx`

Vietati tutti gli altri. Niente commit, `.env`, database, porte 8001/8002.

## Vincoli

- V12: solo interfaccia.
- Ponytail: si riusa `Pannello` e `Informazioni`, niente componenti nuovi.
- Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: le schermate le fa l'orchestratore.

## Resoconto

Rispondi con massimo 5 righe: file toccato, esito `tsc`, dubbi. Non serve un file di resoconto.
