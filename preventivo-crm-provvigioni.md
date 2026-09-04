# Preventivo — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Redatto da:** Ugo Volpato — AI Consultant
**Data:** 04/09/2026
**Cliente:** Decobrands S.r.l. (da confermare)
**Modalità di sviluppo:** assistita da AI (analisi, generazione e codifica tramite modelli AI)

---

## 1. Oggetto

Web app full-stack (**frontend Next.js + React + TypeScript**, **backend NestJS**, **ORM Prisma**, **PostgreSQL condiviso** con la Gestione Ordini — **senza modificare le tabelle esistenti**) per:

- tracciare il percorso **ordine → conferma d'ordine → fattura** delle pratiche verso i fornitori, con **upload dei documenti PDF** e scadenze conferma automatiche;
- controllare i **bollettini** trimestrali dei fornitori, confrontando riga per riga il **riconosciuto** con il **calcolato** (differenze evidenziate, verifica/contestazione);
- **liquidare i subagenti** ogni trimestre con rendiconto calcolato al volo dagli scaglioni e **export a 8 campi**;
- condividere autenticazione, clienti, articoli e ordini con la Gestione Ordini esistente (stesse tabelle, stessi ruoli, `requireAuth`/`requireAdmin`);
- integrare il **modulo ordini cliente** (ordini, upload, liste, clienti, utenti, errori) sulle rotte dell'applicazione.

Riferimento tecnico: `specifica-crm-provvigioni.md` v1.2 (validata con il cliente, §1–§14).

## 2. Tariffe applicate (indicative, mercato Italia)

| Voce | Tariffa oraria |
|---|---|
| Analisi, consulenza e prototipazione | € 80,00 |
| Sviluppo assistito da AI | € 55,00 |
| Sviluppo tradizionale (riferimento) | € 70,00 |

## 3. Attività già svolte (questa sessione)

| # | Attività | Ore | Tariffa | Importo |
|---|---|---|---|---|
| 1 | Analisi del flusso provvigioni (documento `ANALISI_CRM_PROVVIGIONI`, risposte Matteo Caironi) e redazione della **specifica v1.2 validata** con il cliente | 4 | € 80,00 | € 320,00 |
| 2 | Prototipo HTML navigabile: launcher, login, dashboard, anagrafiche (fornitori con scaglioni, agenti/subagenti, interscambio), elenco/dettaglio pratiche, elenco/dettaglio bollettini, liquidazione | 8 | € 80,00 | € 640,00 |
| 3 | Motore di calcolo provvigioni lato client (§10): scaglioni per sconto, eccezioni subagente, associazioni interscambio, nota di credito, confronto bollettini riconosciuto vs calcolato | 3 | € 80,00 | € 240,00 |
| 4 | Export liquidazione a 8 campi (§11) e gestione trimestri | 1 | € 80,00 | € 80,00 |
| 5 | Dati dimostrativi coerenti con il seed (§12): Gries 0/1/5/10/100 %, subagenti Bastasin/Nista, nota di credito e conferma ridotta (7/10) | 2 | € 80,00 | € 160,00 |
| 6 | Stile applicato alla app esistente (Bootstrap 5.3, navbar scura, sfondo `#f5f6f8`, logo) + footer/versione | 1 | € 80,00 | € 80,00 |
| 7 | Debug e rifiniture (footer fisso, launcher, compatibilità anteprima) | 1 | € 80,00 | € 80,00 |
| **Subtotale già svolto** | | **20** | | **€ 1.600,00** |

## 4. Attività da svolgere (implementazione Next.js + NestJS + Prisma)

La colonna "Ore (AI)" è la stima con sviluppo assistito; "Ore (senza AI)" è il tempo che richiederebbe uno sviluppo tradizionale (riferimento).

| # | Attività | Ore (AI) | Ore (senza AI) | Importo (AI) |
|---|---|---|---|---|
| 1 | Setup monorepo (Next.js App Router + NestJS + Prisma), collegamento al **PostgreSQL condiviso** `decobrands`, deploy senza Docker (processi Node separati) | 4 | 10 | € 220,00 |
| 2 | Autenticazione **condivisa** con la Gestione Ordini: riuso tabella `users`, sessioni server-side nel DB, argon2, remember cookie, cambio password / reset token, guard `requireAuth`/`requireAdmin` | 5 | 14 | € 275,00 |
| 3 | Schema Prisma delle **nuove tabelle CRM** (fornitori, scaglioni, eccezioni, agenti, subagenti, interscambio, pratiche + righe, bollettini + righe) + lettura delle tabelle esistenti condivise (ordini cliente, clienti, articoli, giacenze, log) | 6 | 16 | € 330,00 |
| 4 | Motore provvigioni lato server: scaglioni, eccezioni, maturazione maturato/fatturato, congelamento percentuali alla verifica, nota di credito (§4.2, §5.3, §5.5, §5.11) | 5 | 14 | € 275,00 |
| 5 | API REST NestJS: CRUD fornitori + scaglioni, interscambio (vincolo unico), pratiche + righe + cambio stato, **upload documenti PDF** (multer), bollettini + righe con calcolo differenze, liquidazione | 12 | 30 | € 660,00 |
| 6 | Frontend Next.js viste CRM: login, dashboard (KPI + segnalazioni scadenze), anagrafiche, dettaglio pratica con **3 pannelli upload**, bollettini con divergenze, liquidazione + export a 8 campi | 12 | 30 | € 660,00 |
| 7 | Integrazione **modulo ordini cliente** (API `/api/ordini*`, `/api/lookup/*`, `/api/clienti*`, `/api/utenti*`, `/api/errori*` montate) + viste ordini/upload/liste/clienti/utenti/errori coerenti | 6 | 15 | € 330,00 |
| 8 | Test end-to-end, collaudo con dati seed (§12), rifiniture responsive e anteprima produzione | 5 | 13 | € 275,00 |
| **Subtotale da svolgere** | | **55** | **142** | **€ 3.025,00** |

## 5. Riepilogo economico

| Voce | Ore | Importo |
|---|---|---|
| Attività già svolte | 20 | € 1.600,00 |
| Attività da svolgere | 55 | € 3.025,00 |
| **Totale complessivo** | **75** | **€ 4.625,00** |

**Riferimento senza AI** — lo sviluppo tradizionale richiederebbe **142 ore** (≈ 2,6× le ore assistite): 142 h × € 70,00 = **€ 9.940,00**, per un totale di **€ 11.540,00** (€ 1.600,00 già svolto + € 9.940,00 sviluppo).

L'approccio assistito da AI consente un **risparmio di € 6.915,00** sul solo sviluppo (€ 9.940,00 → € 3.025,00, **−70%**).

## 6. Note

- Le ore della sezione "già svolte" sono una **stima** del tempo impiegato in questa sessione (analisi, specifica, prototipo e iterazioni); da confermare.
- Il costo ridotto dello sviluppo riflette la **velocizzazione dell'AI**, non una riduzione di qualità o delle garanzie.
- Tariffe indicative e personalizzabili; **IVA esclusa**.
- Il progetto **condivide il database** con la Gestione Ordini: le tabelle esistenti vengono riusate **senza modifiche**; il CRM aggiunge solo le proprie tabelle (§4.2).
- Esclusioni (casi limite §13 della specifica, in backlog): gestione UI delle eccezioni subagente (B1), pratiche multi-tranche / fatture multi-ordine con tabella a ponte (B2), importazione mensile dei bollettini (B3), riga bollettino per totale cliente (B4), versioning degli scaglioni per periodo (B5), **popolamento dei dati storici reali dagli Excel manuali** (B8). Il consolidamento sconto (B6) è già definito nella specifica.