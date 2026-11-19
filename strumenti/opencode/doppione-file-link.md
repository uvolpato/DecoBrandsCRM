# Pacchetto `doppione-file-link` (frontend)

## Compito

Ugo (18/11/2026): «se aggiungo un file che è già stato aggiunto per errore, vorrei sapere nell'errore per quale pratica è stato aggiunto e poterla con un link vedere».

Il backend (pacchetto `documento-doppione-pratica`) risponde **409** con:

```json
{ "message": "Documento già caricato: è lo stesso file della pratica OF/2026/002",
  "pratica": { "id": "123", "numero": "OF/2026/002" } }
```

`pratica` è `null` se il file non è ancora su nessuna pratica.

## Come

1. `app/frontend/lib/api.ts`, `caricaPdf` (~riga 80): il tipo di ritorno diventa
   `Risposta<{ id: string; file_nome: string; stato: string; ricevuto_il: string; pratica?: { id: string; numero: string } | null }>`.
   Il corpo dell'errore arriva già in `dati` (`dati as never`): non serve altro.
2. `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`, `FinestraDocumento` (~riga 705):
   - nuovo stato `const [praticaDoppione, setPraticaDoppione] = useState<{ id: string; numero: string } | null>(null);`
   - in `invia` (~riga 764) azzera `setPraticaDoppione(null)` all'inizio e, quando `caricaPdf` fallisce, `setPraticaDoppione(c.dati?.pratica ?? null)` oltre a `setErrore(c.messaggio)`;
   - nell'`onFile` del `Caricamento` (~riga 912), dove già si fa `setArrivoId(null)`, azzera anche `praticaDoppione`;
   - sotto il messaggio d'errore del modulo (~riga 916) mostra il link, solo se c'è:
     `<p className="aiuto"><Link href={'/pratiche/' + praticaDoppione.id}>Apri la pratica {praticaDoppione.numero}</Link></p>`
     `Link` è già importato in cima al file.

Nient'altro: la pagina Documenti e i Bollettini mostrano già `r.messaggio`, che ora contiene il numero della pratica (il messaggio temporaneo non può contenere un link: va bene così).

## File ammessi

- `app/frontend/lib/api.ts`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Vietati tutti gli altri: backend, CSS (`stile.css`), altre pagine, spec, guida, piano, prove. Niente commit, `.env`, Integra, database, porte 8001/8002.

## Vincoli

- V12/D-28: il frontend mostra soltanto quello che il server ha già deciso; nessun calcolo.
- Ponytail: nessun componente nuovo, nessuna classe CSS nuova (usa `aiuto`), un solo stato in più.
- Il working tree ha **già modifiche non committate** in `VistaPratica.tsx`: niente `git stash`, `git checkout`, `git reset`; tocca solo le righe necessarie.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: la prova a schermo la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-doppione-file-link.md` con: file toccati, diff sintetico, esito `tsc`, dubbi, e **Da documentare** (una riga per la Guida della pratica: cosa dice l'errore del file già caricato).
