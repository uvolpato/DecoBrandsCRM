# Resoconto — Pacchetto `layout-due-colonne` (17/11/2026)

**Esecutore: DeepSeek/OpenCode.** Database di prova `decobrands_test_e2e` (ricreato prima di ogni prova).
Porte usate: 8012 (backend, da `giro.sh`), 8071 (frontend già acceso, copia ripresa da `prepara.sh`).

## Rilievi corretti

1. **Colonne due (elenco/dettaglio) fra 1100 e 1250 px.** Causa: `.colonne` in `stile.css` dava al dettaglio
   `minmax(300px, 1fr)`, e le pagine passavano `--colonne: … minmax(0,1fr)` in linea (min 0). Corretto **una volta
   in `stile.css`**: il dettaglio ha minimo **560 px** (`.colonne` e `.colonne.pari`); la soglia di impilamento passa
   da 1100 a **1250 px** (nuovo `@media (max-width: 1250px)` con le regole di colonne impilate, tolte dal blocco 1100
   che resta per KPI/catalogo/posta). Le quattro pagine a due colonne (Clienti, Fornitori, Soggetti, Subagenti)
   passano ora `minmax(…, 560px)` in linea e la stessa larghezza alle sagome (`SagomaElenco larghezze`).
2. **Clienti → scheda Agenzie (7 colonne nowrap, ~894 px in ~495).** Da 7 a **2 colonne essenziali + azioni**:
   - *Fornitore* (cresce, va a capo): nome-link + «da confermare»; seconda riga tenue «codice … · seguito da …»;
   - *Condizioni* (va a capo): «Sconto 5 % · al subagente 12 %»; seconda riga tenue «regola · periodo».
   Nessun `nowrap` sui testi lunghi, nessuna barra orizzontale a 1440 e 768 (colonne impilate).
3. **Note fisse di `clienti/**`**: l'unica `<Nota>` («Anagrafica da Integra (sola lettura)») è passata nella finestra
   `Informazioni` (pulsante «i» in alto a destra del pannello cliente), con il testo invariato più due punti che
   spiegano dove sono agenzie e dettagli. Criterio di `note-informazioni.md` (26c): spiegazione fissa → finestra.

## Prove (prepara + giro, 0 KO)

| Prova | Esito |
|---|---|
| `app_clienti` | **59 OK, 0 KO** (aggiunta: Agenzie 1200 px, schermata `app-clienti-1200.png`) |
| `app_fornitori` | **42 OK, 0 KO** (aggiunta: 1200 px, `app-fornitori-1200.png`) |
| `app_soggetti` | **66 OK, 0 KO** (aggiunta: 1200 px, `app-soggetti-1200.png`) |
| `app_subagenti` | **31 OK, 0 KO** (aggiunta: 1200 px, `app-subagenti-1200.png`) |

`npx tsc --noEmit` frontend: pulito. `python -m py_compile` delle quattro prove: pulito.

Nota sulle prove in `app_clienti.py`: il passo «togli il subagente» (D-205, pacchetto parallelo) falliva perché il
menu del campo Subagente copriva `#c-sconto`; ora si toglie il fuoco con `.focus()` invece del clic. Le prove
fallivano anche con il database sporco dei giri precedenti: ricreare `decobrands_test_e2e` con `prepara.sh` prima di
ogni `giro.sh` (come da pacchetto).

## Schermate guardate

- `app-clienti-1200.png`: due colonne impilate, elenco intero e dettaglio sotto, nessuno scorrimento di pagina.
- `app-clienti-agenzie-1440.png`: dettaglio 560 px, tabella Agenzie a 2 colonne + icone, tutto dentro il pannello.
- `app-clienti-1440.png`, `app-fornitori-1200.png`, `app-soggetti-1200.png`, `app-subagenti-1200.png`: impilate a
  1200, elenco e scheda leggibili.
- `app-clienti-768.png`, `app-fornitori-768.png`, `app-soggetti-768.png`, `app-subagenti-768.png`: 768 invariato.

Rilievo minore: `SagomaElenco` (`componenti/Sagoma.tsx`, **non ammesso** in questo pacchetto) ha ancora il default
`minmax(0,1.15fr) minmax(0,1fr)`: le quattro pagine ora passano `larghezze`, altre pagine con sagoma a due colonne
possono avere un salto di larghezza per <150 ms. Da allineare quando si tocca `Sagoma.tsx`.

## Da documentare

- **spec §16.4.1 / regole-interfaccia 26b** (già aggiornata qui): nelle pagine a due colonne il dettaglio ha minimo
  560 px; sotto i 1250 px le colonne si impilano. Verificare se la spec §19 ha una decisione sul layout da estendere
  (es. D-xx «larghezza minima del dettaglio»), altrimenti proporne una a Ugo.
- **Guida** (`assets/guida.js` del prototipo è fuori da questo pacchetto): i testi della scheda Agenzie citano le
  colonne «Codice cliente / Sconto / % subagente / Regola / Periodo». Ora sono *Fornitore* e *Condizioni* con i
  dettagli in seconda riga: da allineare se si aggiorna la Guida.
- **Piano** (`piano-lavoro-crm.md`): nessuna ora nuova; il cambio è dentro le prove di collaudo 0.2.13.
- **Prototipo** `prototipo-alternativo/`: non toccato (questa è una regola dell'app, non dell'idea).
