# Resoconto — Righe della nota di credito (pacchetto `righe-nota-credito`, 16/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/righe-nota-credito.md`.
Decisione di Ugo (D-197): con la nota di credito lo sconto medio si ricalcola sulla **differenza**
fattura − nota; se cambia lo scaglione, cambia la provvigione. Farlo ora (16/11/2026).

## Schema

- Migrazione **scritta, non applicata a `decobrands_db`**: `20261116120000_righe_nota_credito`.
  Allarga il CHECK della fase di `ordini_fornitore_righe` a `('ordine','conferma','fattura','nota_credito')`.
  La tabella era già usabile per la nota (`documento_id` FK esiste), mancava solo il valore della fase.
- Commento del campo `fase` aggiornato in `schema.prisma` (nessuna colonna nuova, additiva).

## Punto unico scelto

`motore.ts`:
- `scontoMedio(p)` ora sottrae le righe della nota (da `d.righe`, `fase = nota_credito`) a quelle della
  fattura: lo sconto medio è quello della **differenza** (lordo/netto della nota tolti). Con lordo 0
  (storno totale) → `null` (riserva, nessuna anomalia). Nuovi helper `scontoMedioFase` (sconto «prima
  della nota») e `lordoNetto`/`scontoDa`.
- `calcoloDocumento`: la base della **nota** è `netto + spese` (le spese della nota riducono quelle della
  fattura, quindi tornano dentro); per la fattura resta `netto − spese`. La somma delle basi dà la base
  della differenza. Sconto medio e scaglione restano `scontoMedio(p)` (differenza) per entrambi.

## Registrazione e lettura

- `faseDi` (documenti.ts) restituisce `'nota_credito'` per la nota: in `registra` (abbinamento dalla
  coda o a mano, «Registra la nota di credito») le righe lette si salvano come per la fattura
  (`quantità, prezzo, sconto, importo, spesa`), nella stessa tabella. La correzione delle righe è già
  la stessa della fattura (nessun file frontend da toccare).

## Visualizzazione

- `dettaglioPratica` (pratiche.ts) espone `sconto_dopo_nota = { valore, scaglione, fattura }` quando lo
  sconto medio della differenza è diverso da quello della fattura (e non c'è anomalia).
- `VistaPratica.tsx`: sulla riga della nota, in tenue, «sconto medio dopo la nota X% → scaglione Y» solo
  quando cambia rispetto alla fattura. La pratica resta somma dei documenti.

## Guida e spec

- `lib/guida.ts` («Come si sceglie la percentuale», punto «quale documento conta»): esempio numerico
  (fattura con riga al 10 % e una allo 0 % → sconto medio 1 %; la nota toglie la riga allo 0 % → 10 %).
- Spec: §19 **D-197** con il perché; *Perché* in §4.2.7.1 e §5.3; versione **8.85**.

## Comando di servizio

`valori-congelati-ricalcola.ts` ricalcola già tutte le note aperte via `calcoloDocumento` (che ora
tratta la base e lo sconto medio della nota): **nessuna estensione di codice necessaria**. Da lanciare
(lo lancia Claude Code, dopo copia di sicurezza):

```
npm run build && npm run valori:congelati -- --prova
```

Numeri attesi su `decobrands_db`: **nessun cambiamento** — le note esistenti non hanno righe
(`faseDi('nota_credito')` era null, non se ne salvavano), quindi lo sconto medio resta quello della
fattura e la base resta il netto. Il nuovo comportamento vale per le note registrate da ora in poi.

## Prove (jest, database `decobrands_test_righe_nota`, creato, migrato e cancellato)

- `righe-nota-credito.spec.ts` (nuove, pure): **8/8** — faseDi; fattura 10 % + nota 10 % (scaglione
  invariato, provvigione proporzionale); fattura mista + nota che toglie lo 0 % (1 % → 10 %, scaglione
  5 → 10); differenza oltre l'ultimo scaglione (anomalia); fattura congelata + nota (fattura invariata,
  nota porta lo scaglione nuovo); nota senza righe (riserva); storno totale (base 0); spese della nota
  (base nota = netto + spese).
- `sconto-medio`, `valori-congelati`, `valori-congelati-db`, `motore`, `seed`: **54/54** (numeri del
  prototipo invariati).
- Suite completa: **858/861, 2 suite KO non mie**: `registro.spec.ts` (2) e `vincoli.spec.ts` (1,
  «una sola anomalia aperta per causa», attende `registro_anomalia_aperta_key` e riceve `registro_pkey`):
  sono il pacchetto `ora-registro` in parallelo (già noto nel resoconto `valori-congelati`), nessun file
  mio tocca `registro`.
- `npx tsc --noEmit` backend e frontend: **OK**.

## Da documentare

- **spec** (già fatto in questo pacchetto): D-197, §4.2.7.1, §5.3, versione 8.85.
- **piano §12**: non toccato (nessuna attività nuova; il lavoro è una correzione del motore).

## Riepilogo (10 righe)

1. Migrazione scritta `20261116120000_righe_nota_credito` (CHECK fase + `nota_credito`), non applicata a `decobrands_db`.
2. `faseDi` restituisce `nota_credito`: le righe della nota si salvano come quelle della fattura.
3. `scontoMedio` sottrae le righe della nota: lo sconto medio è quello della differenza (fattura − nota).
4. `calcoloDocumento`: base della nota = netto + spese; la somma delle basi dà la base della differenza.
5. `dettaglioPratica` + `VistaPratica`: «sconto medio dopo la nota X% → scaglione Y» in tenue quando cambia.
6. Guida con esempio numerico; spec D-197 + *Perché* + versione 8.85.
7. Prove nuove 8/8; sconto-medio/valori-congelati/motore/seed 54/54; seed invariato.
8. Suite completa 858/861: i 3 KO sono `registro.spec.ts`/`vincoli.spec.ts` (pacchetto `ora-registro` in parallelo, non miei).
9. `tsc --noEmit` backend e frontend OK; comando `valori:congelati` già copre le note (nessuna estensione).
10. Limite noto (chiuso in «Correzioni 1»): su una fattura **congelata** che cambia scaglione per la nota, la nota porta la **differenza** (coppia − fissato).

## Correzioni 1 (16/11/2026, pacchetto `righe-nota-credito-correzioni-1`)

### 1. Fattura congelata: la nota porta la differenza (punto 3 della regola)
Nuovo `differenzaNotaCongelata(S, p, d)` in `motore.ts` (D-197 completato): per una nota di credito
su fattura **congelata**, la provvigione della nota è la **differenza** fra la provvigione della coppia
(fattura − note, con lo scaglione della differenza) e i valori già fissati (fattura + note già
congelate), per Decobrands (`agente`) e per il subagente (`subagente`). La base della coppia somma le
basi salvate (fattura) e la base della nota (netto + spese). Usato da `calcoloDocumento` (valore
salvato + `differenza_nota` con il dettaglio), `provvigioneDoc` (Analisi), `riconcilia` (bollettino,
riga e «atteso») e `righeLiquidazione` (voce della nota). La fattura aperta resta come prima
(ricalcolo insieme); quella congelata non si tocca. `CalcoloDocumento` ha il campo opzionale
`differenza_nota` (base_coppia, provvigioni della coppia e fissate, agente e subagente), importi come
testo al centesimo. Nessuna migrazione (JSONB).

Esempio di prova: fattura fissata al 10 % (scaglione 10, 7/3) base 180 → fissato 12,60/5,40; la nota
toglie la riga al 15 % e la differenza scende al 5 % (scaglione 5, 15/8): coppia 95 × 15 % = 14,25 →
nota 1,65 (agente) e 2,20 (subagente); somma fattura + nota = coppia.

### 2. I 3 KO di `registro.spec.ts` e `vincoli.spec.ts`
Rilanciati da soli su `decobrands_test_righe_nota` (creato ex novo e migrato): **43/43, 0 KO**. I 3 KO
del resoconto precedente non erano del pacchetto `ora-registro` (chiuso da ieri): erano processi jest
orfani di ieri, chiusi da Claude Code alle 9:51. Nessuna correzione di `registro.ts`/`vincoli.ts`. Per
portare a 0 KO anche la suite completa ho però corretto `vincoli.spec.ts`: pulisce il database in
`beforeAll` (stesso TRUNCATE di `svuota.ts`), perché nella suite completa gli id/utenti lasciati da un
altro file (es. «ugo») facevano fallire i 36 casi su `utenti_username_key` (da solo passava).

### Prove
- `righe-nota-credito.spec.ts`: **10/10** — aggiunte «fattura congelata al 10 % → la nota porta la
  differenza esatta (1,65 / 2,20)» e «liquidazione chiusa invariata: la nota con la differenza va nel
  trimestre aperto, la fattura resta nel chiuso».
- `valori-congelati.spec.ts` **6/6**; `motore`, `seed`, `sconto-medio`, `valori-congelati-db`,
  `liquidazioni`, `bollettino`, `analisi`, `incassi`: **117/117, 0 KO**.
- Suite completa su `decobrands_test_righe_nota` (ricreato e migrato): **51 suite, 865 prove, 0 KO**.
  Corretto `vincoli.spec.ts` (pulizia del database in `beforeAll`, come `svuota.ts`): nella suite
  completa i 36 casi fallivano per `utenti_username_key` (un'altra prova lasciava l'utente «ugo» del
  seed); da solo passava già. Il crash di teardown di `sistema.spec.ts` (giro casella dopo la fine)
  resta preesistente e non tocca i conteggi.
- `npx tsc --noEmit` backend e frontend: **OK**.

### Da documentare
- spec (fatto in questo pacchetto): versione **8.86**, D-197 completato (fattura congelata → differenza),
  *Perché* §4.2.7.1 e §5.3.
- `lib/guida.ts` (fatto): esempio numerico della nota su fattura fissata (punto «quale documento conta»).
- piano §12: non toccato (correzione del motore, nessuna attività nuova).
