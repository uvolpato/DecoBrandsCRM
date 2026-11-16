# Pacchetto `sconto-da-grezza`

## Problema
Il pacchetto `sconto-riga` (non ancora committato, vedi `strumenti/opencode/resoconto-sconto-riga.md`) ha
aggiunto `sconto` alle righe lette. I documenti letti prima (es. documento in arrivo id 4, Auftrag ARTE
WOHNACCESSOIRES) mostrano la colonna «Sconto» vuota in *Correggi i dati letti*.
`documenti_in_arrivo.lettura_grezza` (D-170 §19) conserva la risposta completa del lettore apposta per
ricavare campi nuovi senza rileggere.

## Compito
1. **Diagnosi** (solo lettura, una SELECT su `decobrands_db`, nessuna scrittura): nella `lettura_grezza`
   del documento 4 c'è l'informazione dello sconto di riga (campo, testo/markdown della pagina, colonna
   «Rabatt»)? Scrivi nel resoconto cosa c'è, senza copiare dati oltre il necessario.
2. Se c'è: ricava `sconto` dalla `lettura_grezza` dove si costruiscono le righe lette per i documenti già
   letti (quando la riga non ha `sconto`), nello stesso modo in cui D-170 ricava gli altri campi nuovi.
   Se il ricavo è un'euristica, ricava lo sconto solo quando quantità × prezzo × (1 − s/100) = importo
   (al centesimo), altrimenti lascia vuoto.
3. Se non c'è: scrivilo nel resoconto e proponi la strada (rileggere il documento con il lettore attuale:
   esiste già un'azione per rileggere? dove?). **Non** implementare la rilettura senza conferma.

## File ammessi
Solo backend: `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/src/lettura.ts`
(hanno già modifiche di `sconto-riga`: aggiungi, non riscrivere), test in `app/backend/test/documenti-lettura.spec.ts`.
Vietati: frontend (un altro pacchetto sta lavorando su `VistaDocumento.tsx`), `.env`, Integra.

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- V12 calcolo sul server; `lettura_grezza` mai al browser. Codice minimo, commenti con `// D-170 §19`.
- Prove solo su `decobrands_test_sconto_grezza` (crealo, cancellalo alla fine). Su `decobrands_db` solo SELECT.
- Niente commit, push, porte 8001/8002; niente `cd`, `/tmp`, `&`.
- Skill: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend; jest `documenti-lettura` con un caso: grezza con sconto, riga senza → sconto ricavato.

## Resoconto
`strumenti/opencode/resoconto-sconto-da-grezza.md`: diagnosi, file toccati, prove, dubbi, «Da documentare».
