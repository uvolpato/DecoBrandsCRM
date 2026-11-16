# Resoconto — Riconoscimento coerente fra elenco, dettaglio e Correggi (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/riconosciuto-coerente.md`. Regole rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), solo letture su `decobrands_db`, prove su `decobrands_test_coerente` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit.

## Cosa è stato fatto

### 1. Una sola fonte del riconoscimento (elenco ↔ dettaglio)
Il problema: l'elenco usa `fornitore_id` salvato (null), il dettaglio lo ri-risolve a ogni apertura (D-164) ma non lo salva. Aggiunto `salvaFornitoreRiconosciuto` in `documenti.ts`, chiamato dalla rotta `GET /api/documenti/:id` **prima** di `dettaglioDocumento`: se la ri-risoluzione (`risolviFornitore`) trova un fornitore certo e il documento non ne ha uno salvato, lo salva (`fornitore_id` + `fornitore_versione_id`) in una transazione con `FOR UPDATE`, evento `documento.update` con `riconosciuto: 'apertura'`. Mai sovrascrive: se `fornitore_id` è già presente esce subito. Così l'elenco vede lo stesso fornitore del dettaglio.

**Il cliente NON si salva**, volutamente: persistere `cliente_id` avrebbe fatto vincere il "cliente scelto a mano" sull'abbinamento per codice (`abbinamento` → null) e rotto il comportamento esistente (prova `documenti-lettura.spec.ts` che si aspetta `proposta.abbinamento`). L'intestazione e Correggi leggono già lo stesso `proposta.abbinamento`/`cliente_riconosciuto` del server: il riconoscimento del cliente è già una fonte sola.

### 2. Intestazione: spunta verde / avviso giallo sotto «Codice cliente»
`esitoCodiceCliente` in `proposta.ts` (riusa `agenziaPerCodice`, stesso calcolo di `controlliFissi`) → campo `codice_cliente_esito` nella risposta del dettaglio. In `VistaDocumento.tsx` tolto il link duplicato del cliente sotto «Codice cliente»; al suo posto: **spunta verde** se il codice è del cliente associato (`corrisponde`), **avviso giallo col motivo** altrimenti (`altro_cliente` = «il codice … presso … è di …», `senza_agenzia`, `da_confermare`).

### 3. Correggi: il cliente parte riconosciuto (pallino verde)
`FinestraCorreggi` inizializza `cliente_id` da `d.testata.cliente_id ?? d.proposta.abbinamento?.cliente_id ?? d.proposta.cliente_riconosciuto?.cliente_id`: il campo Cliente si apre col cliente associato e il pallino diventa verde (il `CampoRicerca` mostra il pallino verde quando il valore è in anagrafica).

## Prove

Su `decobrands_test_coerente` (poi cancellato):
- `npx tsc --noEmit` backend e frontend: puliti.
- jest, una suite per volta: `riconosciuto-coerente` **8/8**, `proposta` **68/68**, `documenti` **68/68**, `documenti-lettura` **23/23**, `numero-ordine-fornitore` **7/7**, `riconoscimento-furbo` **18/18**.
- `python -m py_compile strumenti/prove/app_documenti.py`: 0 errori. Aggiunto il blocco D-175 (spunta verde + avviso giallo nell'intestazione, scheda simulata); il giro nel browser resta a Claude Code.
- Test nuovi in `riconosciuto-coerente.spec.ts`: `esitoCodiceCliente` (corrisponde/altro_cliente/senza_agenzia/da_confermare/assente); l'apertura salva il fornitore e l'elenco lo vede, il cliente non si salva come campo a mano, una scelta a mano non si sovrascrive, l'evento nel registro; l'abbinamento di PR102813 "così com'è" (vedi sotto).

## Sola lettura su `decobrands_db`

- **PR102813** (id 2, proforma): `fornitore_id` null, `codice_cliente` 45172, `importo` 2117,30, `numero_ordine_fornitore` null, `lettura_grezza` null (letta prima di D-169/D-170).
- **PR102848** (id 3, proforma): `fornitore_id` 31 (ARTE), importo 37,20.
- **OF/2026/001** (id 1): cliente 1 `AGRI AGGIO SNC DI AGGIO MAURO & C.`, fornitore 31 `ARTE WOHNACCESSORIES GMBH & CO.KG`, agente 5, stato `inviato`, `numero_ordine_fornitore` null. Documento ordine (id 1): `AU276839`, 2.154,50.
- Agenzia cliente 1 × fornitore 31 (id 2480): `codice_cliente_fornitore` 45172, subagente 25, `da_confermare` false, aperta.

## Cosa succede se Ugo abbina PR102813 così com'è a OF/2026/001

L'abbinamento a mano (`POST /api/documenti/2/abbina` con `pratica_id: 1`, `tipo: proforma`, `numero: PR102813`, `data`, `importo`):
- **sul documento della pratica** (`ordini_fornitore_documenti`): proforma `PR102813`, importo 2.117,30, `testata_id` 1, `arrivo_id` 2, `ruolo` null (prima proforma, nessuna scelta). **Nessun** cliente/fornitore/agenzia scritto: si ereditano dalla pratica.
- **sul file in coda** (`documenti_in_arrivo` id 2): `stato` → `abbinato`, `abbinato_pratica_id` 1, `tipo` proforma. Il `fornitore_id` resta null (l'abbinamento non lo scrive; è ciò che il punto 1 sistema).
- **sulla pratica** OF/2026/001: cliente, fornitore, agente restano 1/31/5 (giusti); lo stato passa a `confermato` (attesa fattura) per la proforma.
- **numero d'ordine**: non si scrive nulla. La proforma ha `numero_ordine_fornitore` null e la pratica pure (creata prima di D-169): l'aggancio è esplicito per `pratica_id`, quindi non serve.

**Verdetto: i dati sono giusti** (cliente AGRI AGGIO ↔ codice 45172, fornitore ARTE, agenzia 2480 già in uso dall'ordine). L'unica cosa non scritta è il `numero_ordine_fornitore` (retro-migrazione di D-169, fuori da questo pacchetto). Verificato con la prova jest `abbinare PR102813 così com'è` e le letture sopra.

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. `esitoCodiceCliente` riusa `agenziaPerCodice` (query parametrizzata); `salvaFornitoreRiconosciuto` scrive solo l'id risolto dal server da `risolviFornitore`, mai un valore dal browser. Il `GET :id` ora scrive, ma solo un riconoscimento derivato (idempotente, nessun privilegio elevato né dato dell'utente). Il blocco `FOR UPDATE` dura una transazione breve e dopo il salvataggio la riapertura non riscrive più.
- `ponytail-review`: lean. `esitoCodiceCliente` e `salvaFornitoreRiconosciuto` sono due funzioni piccole che riusano `agenziaPerCodice`/`risolviFornitore`/`lettoDaCampi`; il componente `EsitoCodiceCliente` è una resa. Nessuna astrazione nuova. `net: 0`.

## Da documentare (per Ugo / il lead)

- **§19 — D-175**: all'apertura del dettaglio il fornitore riconosciuto (D-164) ma non ancora salvato si salva sul documento in una transazione, con evento `documento.update` `riconosciuto: 'apertura'`; mai sovrascrivere una scelta a mano. Il cliente non si salva (il campo `cliente_id` resterebbe "scelto a mano" e vincerebbe sull'abbinamento per codice): l'intestazione e Correggi usano il riconoscimento del server.
- **§6.5 / §7.9**: sotto «Codice cliente» non c'è più il nome del cliente (era un doppione della voce «Cliente»); c'è una spunta verde se il codice è del cliente associato, altrimenti un avviso giallo col motivo (codice di un altro cliente / senza agenzia / da confermare). Lo stato lo calcola il server (`codice_cliente_esito`, riusa `agenziaPerCodice`). In Correggi il campo Cliente parte col cliente associato/riconosciuto.
- **Comando di servizio** (retro-migrazione dei documenti già letti con `fornitore_id` null; da creare e lanciare una volta su `decobrands_db` da Claude Code, fuori dai file ammessi):
  ```ts
  // src/riconosci-apertura.ts
  import 'dotenv/config';
  import { PrismaService } from './prisma.service';
  import { salvaFornitoreRiconosciuto } from './documenti';
  if (require.main === module) {
    const db = new PrismaService();
    (async () => {
      const daLavorare = await db.documenti_in_arrivo.findMany({
        where: { stato: { in: ['da_controllare', 'errore'] }, fornitore_id: null },
        select: { id: true }, orderBy: { id: 'asc' },
      });
      for (const { id } of daLavorare) await salvaFornitoreRiconosciuto(db, id, {});
      console.log(`Documenti ri-risolti: ${daLavorare.length}.`);
    })().catch((e: Error) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
  }
  ```
  più uno script `"riconosci:apertura": "node dist/src/riconosci-apertura.js"` in `package.json` (come `pratiche:ricalcola`).

## Aperti / note

- **`documenti-pratica.spec.ts` 1 KO pre-esistente, non di questo pacchetto**: il test «pratica nuova solo se il fornitore ha uno scaglione» si aspetta `/scaglione/` nel messaggio 409, ma `scaglioneMancante` (già in HEAD) dice «percentuali». Viene dal lavoro D-162 (`scaglione-nel-flusso`), non toccato qui. Il resto della suite passa (25/26).
- **File fuori dall'elenco ammesso** richiesti dal lavoro: nessuno (tutto nei file ammessi; il nuovo test è in `app/backend/test/**`). Il comando di servizio sopra è descritto, non creato (file nuovo).
- Il numero D-175 è una proposta: il lead lo assegna nel registro §19 (l'ultimo documentato è D-152; D-164…D-174 sono già usati da pacchetti paralleli non ancora in spec).
