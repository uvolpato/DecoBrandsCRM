@echo off
rem Avvia o riavvia i servizi dell'app: backend, frontend e Caddy se gestito da noi.
setlocal
where nssm >nul 2>&1
if not errorlevel 1 (
  nssm restart DecobrandsBackend >nul 2>&1 || nssm start DecobrandsBackend >nul 2>&1
  nssm restart DecobrandsFrontend >nul 2>&1 || nssm start DecobrandsFrontend >nul 2>&1
  nssm restart DecobrandsCaddy >nul 2>&1
  exit /b 0
)

for %%t in (DecobrandsBackend DecobrandsFrontend) do (
  schtasks /end /tn %%t >nul 2>&1
)
timeout /t 2 /nobreak >nul
for %%t in (DecobrandsBackend DecobrandsFrontend) do (
  schtasks /run /tn %%t >nul 2>&1 || (echo Attivita' %%t non trovata: lancia setup.cmd & exit /b 1)
)
schtasks /run /tn DecobrandsCaddy >nul 2>&1
exit /b 0
