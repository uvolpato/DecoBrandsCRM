# Pagina di attesa durante i deploy (Caddy)

Come funziona, dove stanno i pezzi e — soprattutto — le trappole che ci hanno fatto perdere
mezza giornata il 20/11/2026. Le decisioni sono **D-213** (la pagina è la prima cosa del
deploy) e **D-215** (cartello nella cartella del progetto, servito da Caddy, **niente
mini-server**), in `specifica-crm-provvigioni.md` §19.

## 1. Come funziona

```
browser → Caddy :8082 ─┬─ esiste app\deploy\manutenzione\maintenance.flag
                       │     → serve index.html + logo (la pagina di attesa)
                       └─ non esiste
                             → reverse_proxy 127.0.0.1:8001 (l'app)
```

Un file su disco fa da interruttore: `deploy.cmd` lo scrive appena parte e lo cancella quando
la prova di salute è passata. Finché c'è, chi apre l'indirizzo vede «Aggiornamento in corso»
invece di un errore di connessione, e l'indirizzo chiesto resta nella barra (`/pratiche` resta
`/pratiche`).

La pagina si ricarica da sola: interroga sé stessa e si accorge di non essere più lei quando la
risposta non contiene il marcatore `decobrands-attesa` (cioè quando è arrivata l'app).

**Preavviso per chi è dentro (D-217).** Prima di scrivere il cartello, `deploy.cmd` chiede quanti
minuti di preavviso dare a chi è dentro (0 = nessuno). Se maggiore di 0 scrive `stato.json` con
`{"fase":"preavviso","tra_minuti":N,"inizio":<epoch>}` e attende N minuti con i servizi ancora accesi: il frontend,
che lo legge ogni 5 s, mostra una card sopra il profilo con countdown (e la nasconde quando scade, se il deploy è stato annullato). Durante il preavviso il file viene riscritto ogni 5 s con `aggiornato`: senza aggiornamenti per ~15 s il frontend capisce che il deploy è stato annullato e nasconde la card. Quando i servizi si
fermano, `stato.json` diventa `{"fase":"manutenzione"}` e il frontend si ricarica da solo sulla
pagina di attesa. `stato.json` è servito da Caddy con un `handle` dedicato **prima** di
`@manutenzione`, così resta leggibile anche ad app ferma.

## 2. I pezzi

| Percorso | Cosa | Chi lo scrive |
|---|---|---|
| `app\deploy\manutenzione\index.html` | la pagina (stile dell'accesso, logo, rotella) | repository |
| `app\deploy\manutenzione\logo-decobrands.png` | il logo | repository |
| `app\deploy\manutenzione\maintenance.flag` | il cartello, contiene la parola `manutenzione` | `deploy.cmd`, a ogni deploy |
| `app\deploy\manutenzione\stato.json` | lo stato del preavviso (D-217): `{"fase":"preavviso","tra_minuti":N}` o `{"fase":"manutenzione"}` | `deploy.cmd` |
| `app\deploy\Caddyfile` | matcher + `handle` che servono la pagina | repository |
| `C:\Decobrands\frontend.env` | porta del frontend, serve solo alla diagnostica | `setup.cmd` |

Il cartello **non** sta in `C:\Decobrands\config`: quella cartella la crea `setup.cmd` da
amministratore, e un deploy non elevato non riesce a cancellarci un file. In più `git checkout`
non tocca i file non tracciati dentro `app\`, quindi il cartello sopravvive agli aggiornamenti.

## 3. Il `Caddyfile` (la parte che sbagliavamo)

```
:8082 {
	encode zstd gzip

	@manutenzione {
		file {
			root C:/Decobrands/app/deploy/manutenzione
			try_files maintenance.flag
		}
	}
	header @manutenzione Cache-Control "no-store"
	handle @manutenzione {
		root * C:/Decobrands/app/deploy/manutenzione
		try_files {path} /index.html
		file_server
	}
	handle {
		reverse_proxy 127.0.0.1:8001 {
			transport http {
				read_timeout 190s     # il PDF passa da LibreOffice: ~1 minuto
			}
		}
	}
}
```

**Regola d'oro:** i file del matcher `file` sono **relativi a una radice**, non accettano un
percorso assoluto. La radice predefinita è la cartella di avvio del processo, che con
l'attività pianificata è `C:\Windows\System32`. Per questo la radice si dichiara dentro il
matcher (`root` + `try_files`). Scritto come `@manutenzione file C:/.../maintenance.flag`
non combacia **mai**: nessun errore, nessun avviso, solo il `reverse_proxy` (e quindi 502 con
i servizi fermi).

Le due `handle` sono mutuamente esclusive: vince la prima che combacia, quindi l'ordine delle
direttive conta solo per la prima. `Cache-Control: no-store` evita che la pagina resti in cache
dopo il deploy.

## 4. Cosa fa `deploy.cmd`

| Momento | Cosa succede |
|---|---|
| prima del cartello (D-217) | chiede i minuti di preavviso (0 = nessuno); se >0 scrive `stato.json` preavviso e attende con i servizi accesi |
| subito, prima del backup (D-213) | `:attesa` → scrive il cartello e `stato.json` manutenzione, chiama `ferma-servizi.cmd`; se il cartello non si scrive lo dice |
| prima di riavviare | `:fermaattesa` → spegne un eventuale mini-server dei rilasci precedenti (D-212, ora tolto) |
| salute passata | cancella il cartello e, se resta, stampa `ATTENZIONE: cartello di manutenzione NON rimosso` |
| fermato prima della build | `:interrotto` → riavvia i servizi e toglie il cartello |
| deploy fallito, ritorno indietro | riavvia i servizi, poi toglie il cartello |

`salute.ps1` controlla che sulla porta del frontend non ci sia ancora un mini-server di un
rilascio vecchio: se c'è, la prova fallisce invece di dichiarare «ok» una pagina di attesa.

## 5. Comandi a mano

Accendere la pagina (per una prova, o per fermare il portale di proposito):

```cmd
echo manutenzione> C:\Decobrands\app\deploy\manutenzione\maintenance.flag
```

Spegnerla:

```cmd
del C:\Decobrands\app\deploy\manutenzione\maintenance.flag
del C:\Decobrands\app\deploy\manutenzione\stato.json
```

> Se un deploy muore a metà e riavvii i servizi a mano, cancella **anche** `stato.json`:
> con `{"fase":"manutenzione"}` ancora presente il frontend si ricaricherebbe in continuazione.

Controllare e applicare una modifica al `Caddyfile` (Caddy **legge la configurazione solo
all'avvio**: senza riavvio continua con quella vecchia in memoria):

```cmd
C:\caddy\caddy.exe validate --config C:\Decobrands\app\deploy\Caddyfile
schtasks /end /tn DecobrandsCaddy
schtasks /run /tn DecobrandsCaddy
```

Leggere cosa è successo:

```cmd
dir C:\Decobrands\app\deploy\manutenzione
type C:\Decobrands\backup\deploy.log
netstat -ano | findstr :8001
```

## 6. Trappole già viste (sintomo → causa → rimedio)

| Sintomo | Causa | Rimedio |
|---|---|---|
| la pagina non sparisce **mai**, anche a deploy finito | il cartello stava in `C:\Decobrands\config` e il `del` falliva per i permessi, in silenzio | cartello dentro `app\deploy\manutenzione` (D-215); il deploy ora avvisa se non riesce a toglierlo |
| 502 con i servizi fermi, e nessuna pagina | `@manutenzione file <percorso assoluto>`: il matcher non combacia mai | `file { root … try_files … }` |
| la pagina funzionava ieri e oggi no | Caddy è ancora acceso con la configurazione di prima (nessun `--watch`) | riavvia l'attività `DecobrandsCaddy` |
| Next non parte: `EADDRINUSE` sulla 8001 | un mini-server di un rilascio vecchio tiene la porta | `netstat -ano \| findstr :8001` e `taskkill /pid <PID> /f`; `avvia-servizi.cmd` lo fa da sé leggendo `config\manutenzione.pid` |
| deploy «riuscito» ma si vede la pagina di attesa | la prova di salute interrogava la 8001, che rispondeva col mini-server | `salute.ps1` ora si ferma se trova il mini-server acceso |
| durante il **primo** deploy dopo D-215 la pagina non compare | Caddy in memoria guarda ancora il vecchio percorso | è solo quel giro: dal successivo è allineato |
| portale **senza** Caddy (frontend esposto sulla 8082) | non c'è nessuno che serva la pagina | accettato: durante il deploy si vede l'errore di connessione. Se un giorno serve, si riapre D-212 in spec |
| il deploy si chiude appena si preme Invio sul preavviso | `%s` nel comando epoch (`Get-Date -UFormat %s`) dentro un file batch: il `%` fa terminare lo script | usare `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`, che non contiene `%` |

## 7. Controllo finale, in 30 secondi

```cmd
echo manutenzione> C:\Decobrands\app\deploy\manutenzione\maintenance.flag
```

apri `http://<server>:8082` → deve dire «Aggiornamento in corso», poi

```cmd
del C:\Decobrands\app\deploy\manutenzione\maintenance.flag
```

ricarica → deve tornare l'app. Se una delle due non torna, il colpevole è nel §6.
