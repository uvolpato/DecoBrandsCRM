# Scrive app\backend\.env per l'esercizio (i valori arrivano da variabili d'ambiente DECO_*).
# Lo chiama setup.cmd. Non sovrascrive un .env esistente: quello lo decide setup.cmd.
param()
$ErrorActionPreference = 'Stop'

$envFile = Join-Path $env:DECO_APP 'backend\.env'
$dbUrl   = $env:DECO_DBURL
$appUrl  = $env:DECO_APPURL
$docs    = $env:DECO_DOCS

function Nuovo-Segreto {
  $b = New-Object 'byte[]' 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  [Convert]::ToBase64String($b)
}
$session = Nuovo-Segreto
$chiavi  = Nuovo-Segreto
if ($session.Length -lt 32 -or $chiavi.Length -lt 32) { throw 'Segreti troppo corti' }

$soffice = 'C:\Program Files\LibreOffice\program\soffice.com'
$sofficeRiga = if (Test-Path $soffice) { "SOFFICE=$soffice" } else { "# SOFFICE= (LibreOffice non trovato: il PDF delle liquidazioni non funziona)" }

$testo = @"
# Ambiente di esercizio. Generato da deploy\setup.cmd il $(Get-Date -Format 'dd/MM/yyyy HH:mm').
DATABASE_URL=$dbUrl
PORT=8002
NODE_ENV=production
# Firma del cookie di sessione e chiave dei segreti delle Impostazioni (generate qui, >= 32 caratteri)
SESSION_SECRET=$session
SESSION_TIMEOUT_MINUTI=30
SEGRETI_CHIAVE=$chiavi
# Indirizzo pubblico, per i link nelle email
APP_URL=$appUrl
# Ponte di sola lettura verso Integra: vuoto = si usano le credenziali di Impostazioni -> Integra
PONTE_URL=
# Limiti ai tentativi (D-41)
TENTATIVI=10
TENTATIVI_IP=100
TENTATIVI_MINUTI=15
TENTATIVI_CARICAMENTI=100
# Documenti arrivati: fuori dal repository
DOCUMENTI_DIR=$docs
DOCUMENTI_MAX_MB=20
$sofficeRiga
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($envFile, $testo, $utf8)
Write-Host "Scritto $envFile"
