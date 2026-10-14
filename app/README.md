# Decobrands CRM — applicazione

Unica cartella che va in produzione. Analisi, specifica, preventivo e prototipo restano
nella radice del repository e **non** vengono scaricati sul server.

## Struttura (modello Portale B2B Luis — spec §16.3)

```
app/
├── frontend/   Next.js 16 + React 19 + TypeScript   (localhost:8001)
├── backend/    NestJS 11 + Prisma 7                 (localhost:8002)
├── deploy/     Caddyfile, script di avvio e pubblicazione
└── README.md
```

## Pubblicazione: solo la cartella `app/`

Primo scaricamento sul server (scarica solo i file di `app/`):

```bash
git clone --filter=blob:none --sparse https://github.com/uvolpato/DecoBrandsCRM.git decobrands-crm
cd decobrands-crm
git sparse-checkout set app
```

Aggiornamenti:

```bash
git pull
```

Sul server la radice contiene solo `app/` (più i file di configurazione git).
