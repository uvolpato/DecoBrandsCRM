# Prova di salute: backend (8002) e frontend (la porta configurata, 8001 di norma, 8082 senza Caddy).
# Esce 0 se rispondono, 1 se no. La chiamano setup.cmd, deploy.cmd ed esponi-in-rete.cmd.
$ErrorActionPreference = 'Stop'
$porta = 8001
$envFile = 'C:\Decobrands\frontend.env'
if (Test-Path $envFile) {
  foreach ($riga in (Get-Content $envFile)) {
    if ($riga -match '^FRONTEND_PORTA=(\d+)') { $porta = [int]$Matches[1] }
  }
}
$atteso = @('http://127.0.0.1:8002/api/salute', "http://127.0.0.1:$porta/")
$limite = (Get-Date).AddSeconds(90)
foreach ($u in $atteso) {
  $ok = $false
  while (-not $ok -and (Get-Date) -lt $limite) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 5
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { $ok = $true }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $ok) {
    Write-Host "NON risponde: $u"
    exit 1
  }
  Write-Host "ok: $u"
}
exit 0
