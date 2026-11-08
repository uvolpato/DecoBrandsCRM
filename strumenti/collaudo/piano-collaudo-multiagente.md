# Collaudo finale multiagente — Decobrands CRM (`app/`)

Versione 1 — 08/11/2026. Oggetto: **solo l'app vera** (`app/`), non il prototipo.

## 0. Regole comuni a tutti gli agenti

- **Sola lettura.** Gli agenti di collaudo non modificano codice: leggono, lanciano le prove,
  scrivono un report. Le correzioni le fanno poi DeepSeek V4 / V4 Flash (§3).
- Prima di leggere codice: `graphify query "<domanda>"`; i file grezzi solo per le righe già
  individuate.
- Le skill si **caricano davvero** (strumento Skill / `skill` in OpenCode), non a memoria.
- Prove solo sul database `decobrands_test`. **Integra (192.168.239.49): mai toccare nulla.**
- Riferimenti obbligatori: `CLAUDE.md`, `specifica-crm-provvigioni.md` (regole V12, V13, §16, §19).
- Un rilievo che va **contro una decisione del §19** non è un errore da correggere: va nella
  sezione *Da decidere (Ugo)* del report, con il D-nn.
- Niente rilievi di gusto: ogni rilievo ha un **scenario concreto** (input/stato → effetto sbagliato).
- Lingua: italiano, conciso.

## 1. Agenti e skill

| Agente | Area | Skill da caricare | File / ambito principali |
|---|---|---|---|
| **A1 Sicurezza** | accesso, sessioni, CSRF, permessi per ruolo, limiti ai tentativi (D-39, D-41), IDOR fra utenti, errori che espongono dati | `owasp-security`, `vibesec`, `auth-implementation-patterns`, `api-security-testing` (checklist OWASP API Top 10; Strix solo se installato), `nestjs-best-practices` | `accesso.ts`, `password.ts`, `superutente.ts`, `utenti.ts`, `segreto.ts`, `main.ts`, `errori.filter.ts`, guardie di tutti i controller |
| **A2 Calcoli e soldi** | provvigioni, percentuali datate, riconciliazione bollettini, liquidazioni, storni/riaccrediti (D-11), Analisi (D-19), esportazioni; **V12: niente valori calcolati dal browser** | `javascript-typescript-jest`, `nestjs-best-practices`, `code-review` | `motore/`, `bollettini.ts`, `bollettino.ts`, `liquidazioni.ts`, `incassi.ts`, `pratiche-ricalcola.ts`, `analisi.ts`, `esporta-liquidazione.ts`, `csv.ts`; numeri sul seed §12 = prototipo |
| **A3 Database e transazioni** | schema, migrazioni, indici, vincoli; **V13: una operazione = una transazione**, `FOR UPDATE` su chiusure/verifiche/abbinamenti, email dopo il commit; viste Integra in sola lettura (D-32) | `postgresql-code-review`, `supabase-postgres-best-practices`, `prisma-client-api`, `prisma-cli` | `prisma/`, tutti i `$transaction`, `integra.ts`, `registro.ts`, `eventi.ts` |
| **A4 Documenti e lettura** | ingresso unico (casella + caricamento), limiti di dimensione/tipo, percorsi dei file, GLM-OCR, abbinamenti, scartati, solleciti (D-03), D-87/D-91/D-92 | `owasp-security` (upload, path traversal, SSRF), `nestjs-best-practices`, `javascript-typescript-jest` | `documenti.ts`, `lettura*.ts`, `lettore.ts`, `casella.ts`, `posta.ts`, `scartati.ts`, `proposta.ts`, `solleciti.ts` |
| **A5 Frontend** | Next.js App Router, componenti fedeli al prototipo, filtri standard (D-22/D-23), sagome (D-59), fuoco interno (D-64), ritorno allo stesso punto (§7.12), nessun calcolo nel browser | `nextjs-app-router-patterns`, `vercel-react-best-practices`, `vercel-composition-patterns`, `ui-ux-pro-max` | `app/frontend/` |
| **A6 Prove e controllo visivo** | lancia `npm test` e tutti gli `strumenti/prove/app_*.py`; schermate a 1440 e 768 px; blocco sotto 744 px (D-44); copertura mancante sui percorsi critici | `webapp-testing`, `playwright-best-practices`, `javascript-typescript-jest` | `app/backend/test/`, `strumenti/prove/app_*.py` |
| **A7 Accessibilità e prestazioni** | WCAG 2.2 (tastiera, etichette, contrasto, ruoli delle schede), tempi delle pagine e delle API pesanti (Analisi, liquidazioni, elenchi lunghi), N+1 | `accessibility`, `performance`, `design:accessibility-review` | pagine principali + API più lente |
| **A8 Complessità e debito** | codice morto, doppioni, astrazioni inutili, commenti `ponytail:` da chiudere | `ponytail:ponytail-audit`, `ponytail:ponytail-debt`, `engineering:tech-debt` | tutto `app/` |
| **A9 Coerenza documenti** | spec, guida in linea (`app/frontend/lib/guida.ts`), `LEGGIMI`, piano §12, §19 allineati al codice; funzioni incerte segnalate come tali (D-06) | `engineering:documentation` | `*.md` di radice, `guida.ts` |
| **ORC Orchestratore** | unisce i report e pianifica le onde (§4) | `caveman`, `engineering:testing-strategy` | `strumenti/collaudo/report/` |

Gli agenti A1–A9 lavorano **in parallelo** (sono tutti in sola lettura). Solo A6 e A7 avviano
l'app: usano porte diverse o lavorano uno dopo l'altro.

## 2. Il report di ogni agente

File: `strumenti/collaudo/report/<Agente>-<area>.md` (es. `A1-sicurezza.md`).

In testa: skill caricate, prove lanciate con l'esito (OK/KO), cosa **non** è stato controllato.
Poi un blocco per rilievo:

```
### A2-03 — Storno del fatturato finisce nel trimestre sbagliato
- Gravità: P0 | P1 | P2 | P3            (vedi sotto)
- Dove: app/backend/src/liquidazioni.ts:142 (funzione righeLiquidazione)
- Problema: una frase.
- Scenario: input/stato → risultato sbagliato (con numeri, se ci sono).
- Correzione puntuale: cosa cambiare, dove, come (righe, condizione, query). Niente "migliorare X".
- Prova che la verifica: test da aggiungere o prova esistente da lanciare (nome del file).
- Esecutore: DeepSeek V4 | DeepSeek V4 Flash   (vedi §3) — motivo in mezza riga
- File toccati: elenco completo
- Dipende da / correlato a: altri ID (anche di altri agenti, se noti), decisione D-nn
```

In fondo: *Da decidere (Ugo)* — rilievi che toccano decisioni del §19 o domande aperte (§5.14).

**Gravità**

| | Quando |
|---|---|
| **P0 critica** | sicurezza sfruttabile, importi sbagliati, perdita o corruzione di dati, scrittura verso Integra |
| **P1 alta** | funzione rotta o regola della spec violata (V12, V13, D-nn) senza danno immediato ai soldi |
| **P2 media** | caso limite, prova mancante su percorso critico, accessibilità che blocca, lentezza percepibile |
| **P3 bassa** | testi, stile, pulizia, documentazione |

## 3. A chi va la correzione

| DeepSeek V4 (complesso) | DeepSeek V4 Flash (semplice) |
|---|---|
| più file o più livelli (backend + frontend) | un file, modifica locale |
| calcoli di provvigioni e soldi, transazioni, lock | testi, etichette, stile, attributi `aria-*` |
| sicurezza (permessi, sessioni, upload) | prove mancanti su logica già giusta |
| migrazioni e schema | documentazione e guida in linea |
| cambio di logica o di flusso | rinomina, codice morto, commenti D-nn |

Nel dubbio: **V4**. Ogni P0 va a V4.

## 4. L'orchestratore

Lavora dopo che tutti i report ci sono. Scrive `strumenti/collaudo/piano-correzioni.md` e un
prompt per pacchetto.

1. **Unisce e pulisce**: toglie i doppioni fra agenti (stesso file e stessa causa → un rilievo,
   si tengono tutti gli ID d'origine); scarta i rilievi senza scenario; sposta in *Da decidere
   (Ugo)* quelli contro il §19.
2. **Forma i pacchetti**: rilievi sullo **stesso file** o sulla **stessa funzione/tabella** vanno
   nello stesso pacchetto (sono correlati: in parallelo si pesterebbero). Gravità del pacchetto =
   la più alta dei suoi rilievi; esecutore = V4 se almeno un rilievo è V4.
3. **Ordina in onde**:
   - **Onda 0 — schema e migrazioni**: in serie, una per volta, prima di tutto (tutti ci dipendono).
   - **Onde 1…n**: un pacchetto entra nell'onda più bassa in cui (a) tutte le sue dipendenze sono
     in onde precedenti e (b) **nessun altro pacchetto della stessa onda tocca un suo file**.
   - A parità, prima i P0, poi P1, P2, P3. Una P3 non blocca mai una P0: se condividono un file,
     la P3 scala all'onda dopo.
4. **Scrive un prompt per pacchetto**: `strumenti/opencode/collaudo-<onda>-<pacchetto>.md` con
   esecutore, rilievi (testo completo), file ammessi (solo quelli), prova da far passare,
   regole V12/V13 e documentazione da aggiornare (§16.5 della spec: §19, *Perché*, guida, piano).
5. **Tabella finale** in `piano-correzioni.md`:

```
| Onda | Pacchetto | Gravità | Esecutore | Rilievi | File | Dipende da |
```

**Fine di ogni onda** (prima di aprire la successiva): `npm test` e `strumenti/prove/app_*.py`
con 0 KO; controllo finale di Claude Code (prove, diff, review completa su codice sensibile:
`owasp-security`, `/code-review`, `/ponytail:ponytail-review`); commit in italiano. Se qualcosa
non va: prompt `…-correzioni-N.md` allo stesso esecutore, non correzione a mano.

## 5. Consegna

- `strumenti/collaudo/report/A1…A9-*.md`
- `strumenti/collaudo/piano-correzioni.md` (onde, pacchetti, *Da decidere (Ugo)*)
- `strumenti/opencode/collaudo-*.md` (un prompt per pacchetto)
