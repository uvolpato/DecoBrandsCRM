# Pacchetto `filtro-pratiche-suggerite`

## Contesto
Nella scheda del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), scheda
**Pratica proposta**, si vedono le pratiche suggerite (proposta calcolata dal server, `propostaDocumento`
in `app/backend/src/proposta.ts`, servita dal GET del documento in `documenti.ts`). Oggi escono anche
pratiche già fatturate (es. OF/2026/001 «Fatturata, pratica già fatturata»).

Ugo (15/11/2026): **a destra della barra delle schede** (stessa riga di «Pratica proposta · Righe lette»)
un **menu a tendina** che filtra le pratiche suggerite. **Predefinito: pratiche con stato aperto.**
(È un filtro di stato, non di entità: la tendina è ammessa, D-22 vale per le entità.)

## Compito
1. **Voci**: «Aperte» (predefinita: tutte le pratiche non fatturate e non chiuse/annullate — verifica gli
   stati veri nello schema e in `STATO_DB` di `pratiche.ts`), «Tutte», poi una voce per stato
   (Solo ordine, Confermata, Fatturata). Riusa le etichette già esistenti.
2. **Server (V12)**: il browser manda solo la scelta (lista chiusa, `@IsIn`); il server filtra le pratiche
   candidate **prima** di ordinarle, così la prima resta «Pratica proposta» fra quelle filtrate. Nessun
   calcolo nel browser. Se la proposta oggi è «Nuova pratica», il filtro non la toglie.
3. **Interfaccia**: se `Schede` ha già un posto per le azioni a destra della barra, usalo; altrimenti
   aggiungi un parametro opzionale generico (`azioni?: ReactNode`) al componente, senza cambiare le altre
   pagine. Tendina con le classi esistenti (`grep` su `stile.css` prima di crearne). Etichetta accessibile
   («Stato delle pratiche»). Al cambio, la lista resta visibile più tenue finché arrivano i nuovi dati
   (D-59). Se il filtro svuota l'elenco: «Nessuna pratica aperta da proporre» e la tendina resta.
4. Catalogo componenti (`app/frontend/app/(app)/componenti/page.tsx`) se cambi `Schede`; nota in
   `app/frontend/lib/guida.ts`.

## File ammessi
`proposta.ts`, `documenti.ts`, `pratiche.ts` (solo se serve la costante degli stati), test
`app/backend/test/proposta.spec.ts`, `VistaDocumento.tsx`, il componente `Schede`, `componenti/page.tsx`,
`lib/guida.ts`. Aggiungi, non riscrivere: modifiche non committate di altri pacchetti da conservare
(anche `filtro-stato-in-modale` appena fatto in `VistaDocumento.tsx`/`CampoRicerca.tsx`).

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. Italiano, rimandi
`// D-nn §19`. Codice minimo. Prove su `decobrands_test_filtro_sugg` (creato e cancellato). Su
`decobrands_db` niente scritture. Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest `proposta`: con il filtro predefinito una pratica fatturata
non è proposta; con «Tutte» sì; valore fuori lista → 400.

## Resoconto
`strumenti/opencode/resoconto-filtro-pratiche-suggerite.md`: file toccati, prove, dubbi, «Da documentare»
(testo pronto per spec e §19).
