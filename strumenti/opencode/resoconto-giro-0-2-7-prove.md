# Resoconto — `giro-0-2-7-prove`

Esecutore: DeepSeek (OpenCode). Pacchetto `strumenti/opencode/giro-0-2-7-prove.md`. Regole comuni
rispettate (`regole-onda-parallela.md`): niente commit/push, niente `cd`/`/tmp`/`&`, `.env` mai letto,
niente `decobrands_db`, niente porte 8001/8002 (giro su 8012 + frontend 8071), niente Integra. Skill
caricate davvero: `playwright-best-practices`, `ponytail-review`, `caveman`.

## Fatto

1. **`FilterBar.tsx`** (difetto vero corretto): la copia nascosta dei segmenti usata per misurare la
   larghezza aveva `.segmenti` + `segmenti-nascosti`, `role="tablist"`, `role="tab"` e badge `.n`:
   era letta da screen reader e dai selettori (es. `app_utenti`: «Tutti .n resolved to 2 elements»).
   Ora usa la classe propria `segmenti-misura` (nessun `.segmenti`), nessun `role`, `tabIndex=-1`,
   `aria-hidden`. I selettori di misura interni aggiornati di conseguenza.
2. **`stile.css`**: `.segmenti-nascosti` → `.segmenti-misura`; le regole di layout dei segmenti
   valgono anche per `.segmenti-misura` (misura stabile del clone).
3. **Nuovo aiuto unico `strumenti/prove/segmenti.py`**: da D-187 i segmenti diventano una tendina
   quando la barra non sta su una riga; le prove leggono numeri, contano, scelgono e leggono lo stato
   da segmenti **o** tendina (`numero`, `quanti`, `scegli`, `scelta`, `testo_voce`, `attendi_numero`).
4. Prove aggiornate all'interfaccia 0.2.7 (vedi tabella sotto).

## Prove nel browser (giro, backend 8012 · frontend 8071, seed pulito `decobrands_test_giro`)

| Prova | Prima | Dopo |
|---|---|---|
| `app_oggi` | 43/0 | 43/0 |
| `app_utenti` | errore (role=tab ×2) | 28/0 |
| `app_fornitori` | 39/2 | 41/0 |
| `app_pratiche` | errore (`invalid literal`) | 24/0 |
| `app_pratica` | errore (`#c-numero`) | 99/0 |
| `app_documenti` | errore (`Page.fill`) | 161/0 |
| `app_soggetti` | errore (segmenti) | 63/0 |
| `app_componenti` | errore (segmenti) | 59/0 |
| `app_registro` | errore (segmenti) | 28/0 |
| `app_filtri_lampeggio` | errore (`.segmenti`) | 18/0 |
| `app_liquidazioni` | errore (rotta corta) | 77/0 |

`npx tsc --noEmit` frontend: **0 errori**. `python -m py_compile` su tutte le prove toccate: **OK**.

## Attesi cambiati (con il pacchetto che li giustifica)

- **segmenti → tendina** (D-187 «barra filtri su una riga», pacchetto `barra-filtri-una-riga`):
  `app_pratiche`, `app_pratica`, `app_soggetti`, `app_registro`, `app_componenti`, `app_filtri_lampeggio`
  leggono/contano/scelgono da segmenti o tendina (aiuto `segmenti.py`). `app_registro` sceglie la tendina
  «Codice» per `aria-label`, non per posizione (la tendina dei segmenti aggiunge un `<select>`).
- **importo calcolato per la riga nuova** (D-153/D-192, pacchetto `sconto-riga`/«Usa importi calcolati in
  blocco»): `app_documenti` non scrive più `righe[2].importo` (la cella è «calcolato»), verifica
  «calcolato · 10,50 €»; aggiunto il `blur` al prezzo (il CampoEuro si riformatta fuori dal fuoco).
- **pallino verde del cliente nella stessa scheda** (D-170, pacchetto `conferma-abbina`): niente più
  `target="_blank"`/`rel="noopener"`; il link si apre nella stessa scheda.
- **conferma abbinamento col numero d'ordine dal server** (pacchetto `conferma-abbina`): si verifica
  «ordine AU276839» (V12), non più l'assenza di «Lo stato della pratica».
- **«Inserisci a mano»** (D-186 «Prendi dalla coda», pacchetto `registra-da-coda`): `app_pratica` passa
  a «Inserisci a mano» in ogni finestra Registra fattura/nota/documento prima di compilare `#c-numero`.
- **CSV del riepilogo** (D-183 «base provvigione», pacchetto dell'onda 15/11): intestazione
  «Imponibile» → «Base provvigione» in `app_liquidazioni`.

## Difetti veri corretti

- Solo **`FilterBar.tsx`**: la copia di misura dei segmenti era esposta a screen reader e selettori
  (`role=tab` doppio). Corretto alla radice con `segmenti-misura`.
- Nessun altro difetto dell'app: i KO «indietro» di `app_fornitori`, la rotta corta di
  `app_liquidazioni` e l'ordinamento di `app_pratiche` erano **solo attese di compilazione del frontend**
  (prima pagina = `next dev` che compila) e si sono risolti col warm-up delle rotte, senza toccare l'app.

## Cose aperte

- Le prove che mutano il database in modo non reversibile (`app_liquidazioni` chiude il 3° trimestre,
  `app_documenti` crea un'agenzia e scarta un documento) richiedono il **seed pulito** (`prepara.sh`)
  prima di ogni giro: su un database già usato falliscono. Già scritto nelle intestazioni delle prove.

## Da documentare

- **Spec §16.4.1 / D-187**: la copia nascosta dei segmenti usata per la misura si chiama
  `segmenti-misura` e non ha `role`/`.n`/`tabindex`: invisibile a screen reader e selettori. È una
  precisazione della decisione D-187 (segmenti → tendina), non una decisione nuova.
