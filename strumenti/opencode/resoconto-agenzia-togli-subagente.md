# Resoconto — Togliere il subagente dalla modifica dell'agenzia (D-205, 17/11/2026)

**Esecutore: DeepSeek.** Pacchetto `strumenti/opencode/agenzia-togli-subagente.md` (rilievo 2 della revisione
0.2.12). Database di prova `decobrands_test_toglisub` (creato, migrato, cancellato a fine lavoro).

## Cosa è stato fatto

1. **Server** (`app/backend/src/clienti.ts`): `DatiAgenzia.subagente_id` accetta `null` (`@IsOptional() @IsInt()`),
   distinguendolo da `undefined` = campo non mandato (non cambiare). In `modificaAgenzia` la ricerca del subagente
   si salta con `null` (niente `BigInt(null)`), e `dopoData.subagente_id` diventa `null`. Il controllo «senza
   subagente niente pct/regola» già presente rifiuta 400 se `pct_subagente`/`regola_mensile` restano valorizzati;
   transazione, evento nel registro e `ricalcolaDocumentiAperti` sono gli stessi degli altri cambi dell'agenzia.
2. **Frontend** (`app/frontend/componenti/FormAgenzia.tsx`): il corpo manda `subagente_id: null` esplicito quando il
   campo è svuotato, e azzera `pct_subagente`/`regola_mensile` (senza subagente non hanno senso). Create e modify
   condividono lo stesso percorso.

## Prove

Su `decobrands_test_toglisub` (creato, `npx prisma migrate deploy`, poi cancellato): `npx tsc --noEmit` pulito nel
backend e nel frontend; `python -m py_compile strumenti/prove/app_clienti.py` pulito.

- jest 0 KO: `clienti.spec.ts` **46/46** (2 prove nuove: modifica con `subagente_id: null` → si toglie e azzera
  pct/regola, null con pct → 400, campo non mandato invariato; documento prima della data resta del subagente, dopo a
  Decobrands), `agenzia-senza-subagente.spec.ts` **7/7**, `liquidazioni.spec.ts` **27/27**.
- Prove nel browser **non lanciate** (regola onda): aggiunto ad `app_clienti.py` il controllo «togliere il subagente
  dalla modifica» (si svuota il campo, pct/regola si spengono, la riga non mostra più «seguito da»). Le lancia
  Claude Code.

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`. Rilievi: nessuno. `null` è gestito nel DTO
(validazione), la query del subagente è Prisma parametrica e si salta per null, i permessi e il 400 sul server restano
(V12); nessun nuovo problema OWASP. Complessità: il cambio è minimo (due righe nel server, un ramo `senzaSub` nel
frontend necessario ad azzerare pct/regola).

## Da documentare

- **§19 — D-205** (estensione): dalla modifica il subagente si può anche **togliere** mandando `subagente_id: null`
  esplicito; il server lo distingue da «non mandato» e azzera pct/regola. Vale da una data come ogni cambio di agenzia
  (D-35).
- **§4.2.6 / §7.6** — nota sul campo Subagente svuotabile in modifica (prima si poteva solo aggiungere).
- **piano §12** — eventuale attività se richiesta da Ugo; non prevista nel pacchetto.

## Aperto

- Niente.
