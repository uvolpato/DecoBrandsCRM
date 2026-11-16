# Resoconto — «Articolo X assente fra le righe della pratica proposta» su tutte le righe (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/confronto-righe.md`. Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), solo letture su `decobrands_db`, prove su `decobrands_test_righe` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit. In parallelo hanno lavorato `conferme-multiple` e `riconosciuto-coerente` sugli stessi file: le loro modifiche sono state conservate.

## Causa (diagnosi su dati veri)

PR102813 (proforma, 49 righe lette) proposta su OF/2026/001, nata dall'ordine AU276839 (51 righe lette). La pratica esiste ma **`ordini_fornitore_righe` è vuoto** (0 righe): quando un documento viene abbinato a una pratica, le righe lette non vengono copiate nella fotografia della pratica (§4.2.8). Solo il seed le crea (`prisma/seed/00-base.ts` L186) e i test le inseriscono a mano; il codice dell'app no. Così il confronto della proposta e il controllo «articolo assente» confrontano contro un elenco vuoto e segnalano tutto.

Verifica: `SELECT count(*) FROM ordini_fornitore_righe WHERE testata_id = 1` → **0**. I codici letti di AU276839 (51) contengono tutti i 49 di PR102813 e anche il 75584 di PR102848: quindi, a righe popolate, **nessun articolo è davvero assente**.

## Correzione

- **`documenti.ts` `registra`** (un posto solo, usato da `abbina` e `crea`): dopo aver creato il documento, se c'è un `arrivo_id` e il tipo ha una fase, copia le righe lette (`lettoDaCampi`) in `ordini_fornitore_righe` con `fase` dal tipo (`faseDi`: ordine→ordine, conferma/proforma→conferma, fattura→fattura; nota di credito e altri senza righe, come il seed). Nella stessa transazione già esistente (V13). Importo = letto oppure quantità × prezzo.
- **`proposta.ts` `Controllo`**: nuovo campo `gruppo` (`lettura` | `confronto`). Ogni controllo lo porta.
- **`proposta.ts` `controlliFissi`** (punto «articolo assente»): confronta contro le sole righe `fase='ordine'` della pratica (non tutte), con i codici normalizzati (`normalizzaCodice`: spazi via). L'articolo assente è un avviso (`grave: false`) col perché: «L'articolo 20656 non c'è nell'ordine AU276839: controlla se è un'aggiunta del fornitore». Se gli articoli assenti sono **più della metà** (e più di uno) un solo punto riassuntivo «Nessuna riga in comune con l'ordine …: forse la pratica non è quella giusta». Il numero dell'ordine viene dal documento `ordine` della pratica (fallback: numero pratica).
- **`proposta.ts` `valutaLettura`**: il livello («Affidabile»/«Da controllare»/«bassa») ora dipende solo dai controlli di **lettura** e dai campi incerti; i punti di «confronto» non lo abbassano (si mostrano separati).
- **`documenti.ts` elenco**: nuovo campo `confronto_n` (punti di confronto salvati nei `controlli`), accanto a `controlli_n`.
- **Frontend**: in `VistaDocumenti.tsx` accanto al livello compare il segno «N avvisi» per i punti dell'abbinamento; in `VistaDocumento.tsx` il riepilogo di *Correggi* è diviso in due gruppi «Lettura» e «Confronto con la pratica» (stile `stile.css` `.riep-gruppo`); `guida.ts` aggiornata («Segni in elenco», riepilogo in due gruppi).

## Prove

Su `decobrands_test_righe` (poi cancellato):
- `npx tsc --noEmit` backend e frontend: puliti.
- jest, una suite per volta: `proposta.spec.ts` **71/71** (test nuovi: avviso col numero dell'ordine, codici uguali → nessun punto, codici con spazi → uguali, molti assenti → un punto riassuntivo), `documenti-pratica.spec.ts` **26/27** (nuovo test «l'abbinamento copia le righe lette nella fotografia»; 1 KO pre-esistente non di questo pacchetto, vedi sotto), `documenti.spec.ts` **68/68**, `documenti-lettura.spec.ts` **23/23**.
- `python -m py_compile strumenti/prove/app_documenti.py strumenti/prove/app_pratica.py`: 0 errori. Giro nel browser **non lanciato** (regola onda): resta a Claude Code.

## Diagnosi rifatta su `decobrands_db` (sola lettura, codice corretto in `dist-prove`)

- **PR102813**: 1 punto — «Nessuna riga in comune con l'ordine AU276839: forse la pratica non è quella giusta» (invece di 49).
- **PR102848**: 1 punto — «L'articolo 75584 non c'è nell'ordine AU276839: controlla se è un'aggiunta del fornitore».

Sono i punti giusti **con la pratica ancora senza righe** (dato creato prima della correzione): il 75584 in realtà c'è nell'ordine (posizione 47 di 51) e i 49 codici di PR102813 sono tutti sottoinsieme dei 51 dell'ordine, quindi **dopo il riempimento delle righe entrambi arrivano a 0 punti**. Il riempimento retroattivo è il comando di servizio qui sotto (da creare e lanciare una volta da Claude Code).

## Comando di servizio (retro-migrazione, da creare/lanciare su `decobrands_db` da Claude Code)

Come `riconosci:apertura` (D-175): per ogni documento della pratica con `arrivo_id` e tipo con fase che non ha ancora righe, copia le righe lette.

```ts
// src/riempi-righe.ts
import 'dotenv/config';
import { PrismaService } from './prisma.service';
import { lettoDaCampi } from './proposta';
import { faseDi } from './documenti';
if (require.main === module) {
  const db = new PrismaService();
  (async () => {
    const daFare = await db.ordini_fornitore_documenti.findMany({
      where: { arrivo_id: { not: null }, tipo: { in: ['ordine', 'conferma', 'proforma', 'fattura'] }, righe: { none: {} } },
      select: { id: true, testata_id: true, tipo: true, arrivo_id: true },
    });
    let n = 0;
    for (const d of daFare) {
      const fase = faseDi(d.tipo as any); if (!fase) continue;
      const letto = await lettoDaCampi(db, d.arrivo_id!);
      if (!letto.righe.length) continue;
      await db.ordini_fornitore_righe.createMany({ data: letto.righe.map((r, i) => ({
        testata_id: d.testata_id, documento_id: d.id, fase, numero_riga: i + 1,
        codice: r.codice, descrizione: r.descrizione, quantita: r.quantita, prezzo_unitario: r.prezzo,
        importo: r.importo != null ? r.importo : (r.quantita != null && r.prezzo != null ? Math.round(r.quantita * r.prezzo * 100) / 100 : null),
      })) });
      n++;
    }
    console.log(`Documenti riempiti: ${n}.`);
  })().catch((e: Error) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
}
```

più `"riempi:righe": "node dist/src/riempi-righe.js"` in `package.json`. `faseDi` andrebbe esportata da `documenti.ts` (ora è `const` interna).

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. I codici confrontati vengono dal DB o dai campi letti (validati in `.correggi`); nessun valore del browser raggiunge SQL (tutto Prisma parametrizzato). Il numero dell'ordine nel testo del punto viene da `documenti`/`pratica` del DB. Il punto è solo testo mostrato (React esegue l'escape).
- `ponytail-review`: lean. `faseDi` e `normalizzaCodice` sono una riga; il riempimento delle righe è un `createMany` nel flusso già esistente. Nessuna astrazione nuova. `net: 0`.

## Da documentare

- **§6.5 punto 5 (controlli fissi)**: l'articolo assente è un avviso (non grave) col numero dell'ordine; quando ne mancano più della metà un solo punto riassuntivo. Il confronto usa le sole righe `fase='ordine'` e codici normalizzati (spazi via; gli zeri iniziali restano parte del codice).
- **§4.2.8 (righe per fase)**: le righe lette si copiano nella fotografia all'abbinamento/registrazione del documento (fase dal tipo), prima d'ora mancavano (solo il seed le creava). Comando di servizio per il riempimento retroattivo.
- **§6.5 punto 6 (livello) / §7.9 (elenco)**: il livello «Affidabile» riguarda la sola lettura; i punti sull'abbinamento (gruppo «confronto») stanno separati, nell'elenco come «N avvisi» e in *Correggi* in due gruppi «Lettura» / «Confronto con la pratica».
- **§19 — D-176**: come sopra (decisione da registrare; D-164…D-175 già usati da pacchetti paralleli non ancora in spec).

## Aperti / note

- **`documenti-pratica.spec.ts` 1 KO pre-esistente, non di questo pacchetto**: «pratica nuova solo se il fornitore ha uno scaglione (D-87)» si aspetta `/scaglione/` nel 409, ma `scaglioneMancante` dice «percentuali» (dal lavoro D-162).
- **Giro nel browser non lanciato** (regola onda): i file `.py` sono compilati e invariati (le prove esistenti non toccano il nuovo segno «N avvisi»); se serve una prova dedicata la aggiunge Claude Code.
- **Zeri iniziali**: non normalizzati (un codice «007» e «7» restano distinti); i dati reali sono puliti. Se servirà, si decide nel §19.
- Il numero D-176 è una proposta: il lead lo assegna nel registro §19.
