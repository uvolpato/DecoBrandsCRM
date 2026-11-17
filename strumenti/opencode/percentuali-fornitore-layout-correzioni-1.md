# Pacchetto `percentuali-fornitore-layout-correzioni-1`

Leggi `percentuali-fornitore-layout.md` e i resoconti `resoconto-percentuali-fornitore-layout.md`,
`resoconto-prove-browser-0-2-9.md`. Schermate di Claude Code:
`strumenti/collaudo/e2e/uscita/e2e/app_fornitori/percentuali-1440.png` e `percentuali-768.png`.

## Rilievi
1. **Intestazioni spezzate lettera per lettera** a 1440 px nella tabella scaglioni (pannello destro largo ~480 px):
   «Scont/o», «Dal fornitor/e», «Margine Decobrand/s», «Cli/ent/i». Le larghezze in % (`.scaglioni-tabella … nth-child`)
   sono troppo strette per le colonne corte. Correzione: le intestazioni non si spezzano dentro le parole
   (`word-break: normal; overflow-wrap: normal; hyphens: none`), colonne numeriche strette ma sufficienti per la parola,
   testi d'intestazione brevi dove serve (es. «Sconto», «Fornitore», «Subagente», «Margine», «Clienti»; il significato
   lungo sta già nella finestra «Informazioni»). Niente barra orizzontale, a 1440 e a 768.
2. **Finestra «Nuovo scaglione» vuota** nella schermata a 1440 (solo «Chiudi»), piena a 768. Capisci se è un difetto
   dell'app (contenuto che non si monta, condizione sulla larghezza, stato perso) o solo il momento della schermata nella
   prova. Se è dell'app, correggila; se è la prova, fai aspettare il campo «Valide dal» prima della schermata.
3. Controlla la scheda **Ruoli** del soggetto (pulsante «Informazioni» accanto ad «Aggiungi ruolo») e aggiungi alla prova
   `app_soggetti.py` una schermata a 1440 e 768 di quella scheda (`ruoli-1440.png`, `ruoli-768.png`).

## Prove
`npx tsc --noEmit` frontend pulito. Poi dalla radice: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e
`bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_soggetti app_componenti`: 0 KO. Guarda le
schermate prodotte prima di chiudere.

## File ammessi
`app/frontend/app/(app)/fornitori/VistaFornitori.tsx`, `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`,
`app/frontend/app/stile/stile.css` (solo le classi `.scaglioni-*` e quelle aggiunte dalla 0.2.9),
`app/frontend/componenti/FormPercentuali.tsx` e `Modale.tsx` solo se il rilievo 2 è lì, `strumenti/prove/app_fornitori.py`,
`strumenti/prove/app_soggetti.py`.

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md`. Niente commit,
`cd`, `/tmp`, `&`, `.env`, porte 8001/8002. Skill: `ui-ux-pro-max`, `ponytail-review`, `caveman`. Resoconto in fondo a
`resoconto-percentuali-fornitore-layout.md` («Correzioni 1»). Riepilogo in massimo 8 righe.
