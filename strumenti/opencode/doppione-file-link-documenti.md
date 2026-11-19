# Pacchetto `doppione-file-link-documenti` (frontend)

## Compito

Ugo (18/11/2026): ricaricando dalla pagina **Documenti** un file già caricato per errore, l'avviso temporaneo dice la pratica ma non si può aprire. Deve comparire un riquadro d'errore **fisso in pagina**, con il link alla pratica.

Il backend manda già (409 di `POST /api/documenti/carica`) e `caricaPdf` già tipizza:

```json
{ "message": "Documento già caricato: è lo stesso file della pratica OF/2026/011",
  "pratica": { "id": "11", "numero": "OF/2026/011" } }
```

`pratica` è `null` se il file non è ancora su nessuna pratica (resta il messaggio «è lo stesso file di uno già arrivato»).

## Come

`app/frontend/app/(app)/documenti/VistaDocumenti.tsx`:

1. nuovo stato accanto a quelli esistenti (~riga 49):
   `const [rifiutato, setRifiutato] = useState<{ messaggio: string; pratica: { id: string; numero: string } | null } | null>(null);`
2. in `carica` (~riga 94): azzera `setRifiutato(null)` all'inizio; sui file falliti metti il rifiuto nello stato **al posto** di `avviso(r.messaggio, true)` (un file per volta: si tiene l'ultimo). Se almeno un file entra, il rifiuto precedente resta com'è: non azzerarlo a fine giro.
3. sotto il `Caricamento` (~riga 134), dentro lo stesso `<>…</>` di `puoModifica`, il riquadro:

```tsx
{rifiutato && (
  <div className="avviso-variazioni" role="alert">
    <Icona nome="avviso" />
    <span>{rifiutato.messaggio}
      {rifiutato.pratica && <> <Link href={'/pratiche/' + rifiutato.pratica.id}>Apri la pratica {rifiutato.pratica.numero}</Link></>}
    </span>
  </div>
)}
```

`Icona` e `Link` sono già importati; `avviso-variazioni` è già usata in questa pagina per il riquadro della lettura non configurata. Nessuna classe CSS nuova.

Nient'altro: la finestra della pratica e i Bollettini restano come sono.

## File ammessi

- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

Vietati tutti gli altri: backend, CSS, altre pagine, spec, guida, piano, prove. Niente commit, `.env`, database, porte 8001/8002.

## Vincoli

- V12/D-28: si mostra solo quello che il server ha risposto.
- Ponytail: nessun componente nuovo, nessuna classe CSS nuova, uno stato in più.
- Il working tree ha **già modifiche non committate**: niente `git stash`, `git checkout`, `git reset`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: la prova a schermo la fa l'orchestratore.

## Resoconto

Aggiorna `strumenti/opencode/resoconto-doppione-file-link.md` (aggiungi una sezione «Pagina Documenti»: file toccato, diff sintetico, esito `tsc`, dubbi, riga per la Guida).
