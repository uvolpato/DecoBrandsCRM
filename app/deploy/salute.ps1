# Prova di salute: backend (8002) e frontend (8001). Esce 0 se rispondono, 1 se no.
# Lo chiamano setup.cmd e deploy.cmd.
$ErrorActionPreference = 'Stop'
$atteso = @('http://127.0.0.1:8002/api/salute', 'http://127.0.0.1:8001/')
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
