# Correggi i dati letti: ordine, cliente, Integra (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo sta caricando i documenti veri).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_ordine` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai porte 8001/8002, Integra (192.168.239.49) mai. Niente commit.

## Contesto
Nell'albero ci sono le modifiche non committate di `ricerca-con-integra` e `fornitore-letto` (leggi i due resoconti in `strumenti/opencode/`). Ugo prova con il documento `Auftrag_AU276839.pdf`, fornitore letto «ARTE WOHNACCESSOIRES GMBH & CO.KG», cliente letto «Agri Aggio SNC di Aggio Mauro & …». Anagrafica del CRM vuota: fornitore e cliente vanno trovati nelle viste di Integra (`public.integra_v_fornitori`, `integra_v_clienti`).

## Cosa dice Ugo (finestra *Correggi i dati letti*, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` ~righe 830–900)
1. **«Che caos»: la testata è disordinata.**
   - Il campo Fornitore ha il pallino sopra, la lente **sotto** il campo invece che dentro/dopo sulla stessa riga, e «Letto: … · Cerca questo» stretto nella colonna: la riga diventa alta e lascia buchi.
   - Con `testoIniziale` `Singola` in `componenti/CampoRicerca.tsx` mette `flexWrap: 'wrap'` sulla `.ricerca`: è questo che manda la lente a capo. La lente deve restare **sempre** sulla stessa riga del campo (come nelle altre ricerche). La riga «Letto: … · Cerca questo» va **sotto** il gruppo campo+lente, fuori dal flex della `.ricerca`, a tutta larghezza del campo, su una riga (ellissi se lunga, nome intero nel `title`).
   - Il pallino di stato va allineato come negli altri campi (a fianco, non sopra).
   - «Fornitore letto» compare due volte (testo sotto la ricerca e campo «Fornitore letto»): resta il campo, e la riga sotto la ricerca diventa solo il link **«Cerca "<nome letto>"»** (o tienila ma corta). Scegli la forma più pulita; nessun dato doppio.
   - Griglia: Tipo, Numero, Data, Fornitore sulla prima riga; Fornitore letto, Codice cliente, **Cliente** (ricerca), Cliente letto; P.IVA cliente, Importo. Allineate in alto, stessa altezza.
2. **Manca il suggerimento per il cliente.** In *Correggi* c'è solo «Cliente letto», non una ricerca del cliente con il letto proposto come per il fornitore. E nella modale *Apri la pratica* (riga ~278) il campo cliente non ha `testoIniziale` dal cliente letto (il fornitore sì, riga ~277). Aggiungi in tutte e due il cliente letto come «Cerca questo», come per il fornitore. Se in *Correggi* il cliente scelto non ha dove salvarsi (il documento non ha `cliente_id`, vedi D-152 nel resoconto `riconosci-scegli`), usa lo stesso meccanismo già usato da D-152 per il cliente scelto e scrivilo nel resoconto; non toccare lo schema.
3. **La ricerca sulle viste di Integra non mostra nulla.** Ipotesi da verificare per prima: `sqlRicerca` in `app/backend/src/anagrafica-integra.ts` cerca `ragione_sociale ILIKE '%<testo intero>%'`; con «Cerca questo» il testo è il nome letto per intero («ARTE WOHNACCESSOIRES GMBH & CO.KG») che in Integra è scritto diverso (punti, spazi, «CO. KG», maiuscole). Lo stesso vale per la ricerca nel CRM.
   - Correzione attesa: la ragione sociale si cerca **per parole** (ogni parola significativa di almeno 3 caratteri, tolte forme societarie come SRL, SNC, SPA, GMBH, CO, KG, & e la punteggiatura), tutte in `AND` con `ILIKE` parametrizzato; ordinamento invariato (codice esatto, P.IVA, poi nome). Massimo 5 parole. SQL sempre con parametri, niente concatenazioni del testo.
   - Fai lo stesso nel filtro lato frontend del CRM (`punti`/`vociMenu` in `CampoRicerca.tsx`) se cerca la stringa intera.
   - Controlla anche le altre cause: permesso `dati.consulta` di un amministratore, stato 403 mostrato come vuoto, il riquadro Integra che compare solo con il menu aperto (`q={aperto ? testo : ''}`), il filtro che esclude i già importati. Riproduci con una prova jest su `decobrands_test_ordine` (vista finta come fanno già i test di `anagrafica-integra.spec.ts`) con un nome scritto in modo diverso.
4. **Tendina del riepilogo affidabilità** (riga ~741 `useState(true)`, ~838–850): chiusa di default; freccia ▸ chiusa / ▾ aperta nel pulsante, `aria-expanded`; con 0 punti niente freccia e niente area vuota sotto (oggi resta un riquadro bianco vuoto sotto «tutti i campi sono controllati»).
5. **Prova `app_documenti` bloccata**: `strumenti/prove/app_documenti.py` riga ~52 aspetta `.selezionabile a` e va in timeout (30 s) all'inizio. Capisci se è la prova (b/c) o l'app (a) e correggi.

## File ammessi
`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/Campo.tsx`, `app/frontend/app/stile.css` (solo classi nuove o di questi campi, controlla con grep che non esistano), `app/backend/src/anagrafica-integra.ts`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/test/anagrafica-integra.spec.ts`, `app/backend/test/documenti.spec.ts`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Regole
V12 (la ricerca la fa il server), V13; italiano; commenti con rimando (`// D-152`); codice minimo. Skill da caricare davvero: `owasp-security`, `postgresql-code-review` (SQL), `ponytail-review`, `caveman`.

## Fine
- `npx tsc --noEmit` in backend e frontend; jest `anagrafica-integra.spec.ts` e `documenti.spec.ts`, una per volta, con `DATABASE_URL_TEST` su `decobrands_test_ordine`.
- Prova nel browser solo `app_documenti`: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO. Aggiungi controlli: lente sulla stessa riga del campo Fornitore (stessa `top` ± 4 px), cliente con «Cerca questo», tendina chiusa senza area vuota.
- Una schermata a 1440 px della finestra *Correggi i dati letti* in `strumenti/collaudo/e2e/uscita/correggi-1440.png`.
- Resoconto `strumenti/opencode/resoconto-correggi-ordine.md`: causa vera del punto 3, file toccati, prove, «Da documentare» (spec §7.9, §16.4.1, §19).
