# Resoconto — numero d'ordine del fornitore (D-169, D-170) + intestazione documento (rilievi C/D/E) (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/numero-ordine-fornitore.md` (P1) + tre rilievi di Ugo sull'intestazione del documento (A/B e C/D/E). Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto (URL del database costruito con grep), prove su `decobrands_test_numord` (creato, migrazioni, poi cancellato), solo letture su `decobrands_db`, niente 8001/8002, niente Integra, niente commit.

## Verifica del punto 1 (scritta nel resoconto)

- `ordini_fornitore_testata.numero_ordine` è **il numero della pratica** del CRM (`OF/AAAA/NNN`, unico per tabella, generato da `nuovaPratica` con `pg_advisory_xact_lock`): NON è il numero d'ordine del fornitore. Commento in schema: «numero_ordine = numero della pratica» (D-60).
- Non esisteva alcun campo per il numero d'ordine del fornitore.
- Campi letti oggi da `lettura.ts` (schema + prompt): `tipo`, `numero`, `data`, `fornitore`, `codice_cliente`, `cliente`, `piva_cliente`, `piva_fornitore`, `importo_totale`, `mese`, `anno`, `riferimento_fattura`, `righe[]`. Manca `numero_ordine_fornitore`.
- Su `decobrands_db` (sola lettura) per PR102848 (`documenti_in_arrivo.id=3`): `tipo=proforma`, `fornitore_id=31` (ARTE WOHNACCESSORIES, versione 31), campi `numero=PR102848`, `codice_cliente=45172`, `cliente=Agri Aggio srl`, `cliente_id=1` (verificato), `piva_cliente=04364290264`, `data=2026-04-08`. Interscambio 2480: cliente 1 × fornitore 31, `codice_cliente_fornitore=45172`, `valido_dal=2000-01-01`, `da_confermare=false`.

## Migrazione

Nuova migrazione `20261115100000_numero_ordine_fornitore` (una sola):
- `ALTER TABLE ordini_fornitore_testata ADD COLUMN numero_ordine_fornitore VARCHAR(50)`;
- indice univoco parziale `(fornitore_id, numero_ordine_fornitore) WHERE numero_ordine_fornitore IS NOT NULL` (la coppia fornitore + numero è unica, mai il numero da solo);
- `ALTER TABLE documenti_in_arrivo ADD COLUMN lettura_grezza JSONB`.

Comando: `npx prisma migrate deploy` (poi `npx prisma generate`, già rigenerato).

## Cosa è stato fatto

1. **Campo letto `numero_ordine_fornitore`** (`lettura.ts`): aggiunto a schema e prompt («per l'ordine è il suo numero; per proforma/conferma/fattura/nota è il riferimento all'ordine stampato: Auftrag/Order/Bestellung/Ordine n./Ihre Bestellung/Rif. ordine»), a `TESTATA_CAMPI` in `documenti.ts` (campo ammesso della correzione), esposto in `dettaglio` (testata) e nell'elenco.
2. **Pratica marchiata** (D-169): `ordini_fornitore_testata.numero_ordine_fornitore`; `nuovaPratica` lo prende dal numero dell'ordine (`b.numero`), con controllo dell'unicità fornitore + numero (409 se già usato). Il numero della pratica (`numero_ordine`) resta il riferimento principale.
3. **Aggancio prima di tutto il resto** (`proposta.ts`): per proforma/conferma/fattura/nota con `numero_ordine_fornitore` si cerca la pratica per fornitore + numero (mai il numero da solo); una sola → aggancio certo (`esito='certo'`, campo nuovo `pratica_ordine`); più di una (fornitore non riconosciuto) → `esito='ambiguo'` con i candidati (mai a caso, D-111). Fornitore/cliente/agenzia si ereditano dalla pratica perché `abbina` a `pratica_id` non usa i campi del documento.
4. **Verifica del cliente dopo l'aggancio** (D-169 4b): `clienteCoincideOrdine` confronta il cliente del documento (codice cliente del fornitore, P.IVA, nome letto) con quello della pratica; solo se coincide → abbinamento fatto; altrimenti (o non determinabile) `controlliFissi` emette il punto «Il cliente del documento non coincide con quello della pratica AU276839 (…)», mai un abbinamento al cliente da solo.
5. **Titolo del documento** («Proforma PR102848 · ordine AU276839»): nell'elenco Documenti e nel dettaglio, quando c'è il numero d'ordine e il tipo non è ordine.
6. **`lettura_grezza` (D-170)**: colonna JSONB, salvata a ogni lettura nella stessa transazione dei campi (risposta completa del lettore, `Lettura.grezza` in `lettore.ts`; tetto 5 MB con commento). Mai mandata al browser: il dettaglio espone solo il booleano `lettura_grezza`. Azione `POST /documenti/:id/ricava-ordine` (permesso provvigioni.modifica) che estrae `numero_ordine_fornitore` dal testo salvato con regole semplici sulle diciture (funzioni pure `estraiNumeroOrdine`/`testiDaGrezza`, esportate) e lo propone come campo letto da confermare; senza grezza risponde «rileggi il documento».
7. **`Rileggi il documento`** ora vale anche da `da_controllare` (D-170): rileggere un documento già letto per i campi nuovi (prima solo da `errore`).
8. **Ordine dell'elenco Documenti** (D-169 §19): tutta la coda di lavoro (in coda, in lettura, da controllare, errore) dal più vecchio caricato al più recente; l'elenco non mostra documenti chiusi, quindi un solo ordine crescente.
9. **Elenco Pratiche**: colonna «Ordine fornitore» (ordinabile) e ricerca insieme al numero (`pratiche.ts` ORDINI/COLONNA/filtro `q`). Dettaglio pratica: `numero_ordine_fornitore` nell'intestazione («Ordine fornitore AU276839»).
10. **Rilievo E (causa vera)**: per PR102848 il cliente scelto a mano non risultava riconosciuto perché il ramo proforma/altro di `propostaDocumento` restituiva `cliente_riconosciuto: null` (sovrascritto). Corretto: passa `cliente_riconosciuto`. Inoltre il messaggio «Codice cliente non presente» veniva dai **controlli salvati** (`documenti_in_arrivo.controlli`), stantii perché il documento fu letto prima della correzione codice-cliente-non-trovato: `dettaglioDocumento` ora **ricalcola** i controlli con `controlliFissi` (come già faceva per la proposta), non legge i valori salvati.
11. **Rilievi C/D** (frontend, `VistaDocumento`): il fornitore è tolto dal titolo del documento (resta tipo + numero + «· ordine AU…»); nome PDF e pulsanti allineati a destra sulla stessa riga del titolo (`.pannello-testa` `justify-content:flex-start` + `.pannello-destra` `margin-left:auto`, resta a destra anche a capo a 768 px).
12. **Rilievo A** (pallini verdi in `Correggi i dati letti`, `FormAgenzia`, `Apri la pratica`): i pallini ora aprono nella **stessa scheda** (niente più `target="_blank"` in `CampoRicerca`; `Link` di next) e, se ci sono dati non salvati, chiedono conferma con una finestra dell'app («Hai correzioni non salvate: uscire senza salvare?» Esci/Resta, prop `annulla` di `Conferma`). Idem il link agli scaglioni in `FormAgenzia`.
13. **Rilievo B**: intestazione del documento con la voce «Cliente» (nome del cliente scelto/riconosciuto o della pratica agganciata, link alla scheda; «non ancora associato» se non c'è); la nota del «Codice cliente» usa il controllo ricalcolato (se l'agenzia è del cliente associato non compare più «non trovato»).

## Prove

- `npx tsc --noEmit` OK nel backend e nel frontend.
- jest su `decobrands_test_numord` (creato, `prisma migrate deploy`, poi **cancellato**), una suite per volta:
  - `numero-ordine-fornitore.spec.ts` (nuova): **7/7** — estrazione del numero dalla dizione, aggancio certo con cliente che coincide, cliente diverso → punto da controllare (mai abbinato da solo), due pratiche con lo stesso numero (fornitore non riconosciuto) → da scegliere, documento senza numero → riconoscimento di prima, proforma con cliente scelto a mano + agenzia per il codice → cliente riconosciuto e nessun rilievo (rilievo E).
  - `proposta.spec.ts` **63/63**, `lettura.spec.ts` + `lettore.spec.ts` **36/36**, `documenti.spec.ts` **68/68**, `documenti-lettura.spec.ts` **23/23** (aggiornati: ordine crescente della coda, controlli ricalcolati, rileggi da `da_controllare`), `riconoscimento-furbo.spec.ts` **13/13** (aggiornato: coda unica dal più vecchio).
- Prove nel browser **non lanciate** (regole onda): aggiornati `app_documenti.py` (voce «Cliente» nell'intestazione), `app_pratiche.py` (colonna «Ordine fornitore» + indici delle colonne spostati per la colonna nuova), `python -m py_compile` OK. Le lancia Claude Code con `giro.sh`.

## Controlli (skill caricate davvero)

- `owasp-security`: la rotta `ricava-ordine` e l'aggancio ricalcolano tutto dal DB (V12), permesso `provvigioni.modifica`, transazione con riga bloccata; `$queryRaw`/`Prisma.sql` parametrizzati; `lettura_grezza` mai mandata al browser (solo il booleano). Nessuna iniezione.
- `postgresql-code-review`: indice univoco **parziale** su `(fornitore_id, numero_ordine_fornitore)` (le pratiche senza numero non collidono); `lettura_grezza` JSONB senza indice (solo lettura per il `ricava`, non cercata). Niente indici mancanti sulle nuove query.
- `ponytail-review`: `praticaPerOrdine`/`clienteCoincideOrdine`/`candidatoOrdine` sono helper unici riusati; il `ricava` riusa `valutaLettura` e `documenti_campi`; nessuna astrazione o dipendenza nuova. `net: 0`.

## Da documentare (spec)

- **§4.2.7 / §4.2.12**: `ordini_fornitore_testata.numero_ordine_fornitore` (unico per fornitore, indice parziale) e `documenti_in_arrivo.lettura_grezza` (JSONB).
- **§6.5 lettura e abbinamento**: campo letto `numero_ordine_fornitore` (ordine = suo numero; proforma/conferma/fattura/nota = riferimento all'ordine); aggancio per fornitore + numero prima di tutto il resto; verifica del cliente dopo l'aggancio (D-169 4b); `lettura_grezza` e azione «Ricava i campi nuovi dal testo già letto»; «Rileggi» anche da da_controllare; coda di lavoro dal più vecchio.
- **§7.2 / §7.3 Pratiche**: colonna «Ordine fornitore» (ordinabile, cercabile) e «Ordine fornitore AU…» nell'intestazione della scheda.
- **§7.9 Documento**: titolo «Proforma PR102848 · ordine AU276839»; intestazione con la voce «Cliente»; il fornitore non è più nel titolo.
- **§19 — D-169**: la coppia (fornitore, numero d'ordine) è la chiave dell'aggancio, mai il numero da solo; la pratica è marchiata col numero d'ordine; il numero della pratica resta la codifica principale. **D-170**: la risposta completa del lettore si salva (`lettura_grezza`, mai al browser) per ricavare campi nuovi senza rileggere.

## Aperti / note

- **File fuori dall'elenco ammesso** (richiesti dai rilievi A/C/D di Ugo, che cambiano il comportamento del pallino e il layout condiviso): `componenti/CampoRicerca.tsx`, `componenti/Campo.tsx`, `componenti/Modale.tsx`, `componenti/FormAgenzia.tsx`, `app/stile/stile.css`. Da tenere presenti se altri pacchetti li toccano in parallelo.
- `documenti_in_arrivo.controlli` e `livello` salvati restano stantii sui documenti letti prima di D-169/D-170: il dettaglio li ricalcola, ma l'elenco (`controlli_n`) e il `livello` in testa alla pagina leggono ancora i valori salvati. Si allineano alla prossima lettura/correzione; se serve, un ricalcolo massivo va deciso con Ugo.
- I documenti letti prima di questa versione non hanno `lettura_grezza`: per il numero d'ordine serve la correzione a mano o «Rileggi il documento».
- La colonna «Ordine fornitore» dell'elenco Pratiche è vuota sul seed (le pratiche di prova non hanno il numero): si riempie aprendo una pratica nuova da un ordine col numero letto.
- I rilievi A/D non sono stati verificati visivamente (prove browser non lanciate, come da regole onda): la schermata va guardata da Claude Code col giro su 8001/8002.
