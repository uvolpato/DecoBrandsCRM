@echo off
rem Avvia o riavvia i servizi dell'app: backend, frontend e Caddy se gestito da noi.
setlocal
rem D-212: se un deploy si e' interrotto, la pagina di attesa puo' essere ancora sulla porta del
rem frontend: la si toglie prima, altrimenti Next non riesce ad ascoltare (EADDRINUSE).
if exist "C:\Decobrands\config\manutenzione.pid" (
  for /f "usebackq" %%p in ("C:\Decobrands\config\manutenzione.pid") do taskkill /pid %%p /f >nul 2>&1
  del "C:\Decobrands\config\manutenzione.pid" >nul 2>&1
)
where nssm >nul 2>&1
if not errorlevel 1 (
  nssm restart DecobrandsBackend >nul 2>&1 || nssm start DecobrandsBackend >nul 2>&1
  nssm restart DecobrandsFrontend >nul 2>&1 || nssm start DecobrandsFrontend >nul 2>&1
  nssm restart DecobrandsCaddy >nul 2>&1
  exit /b 0
)

for %%t in (DecobrandsBackend DecobrandsFrontend DecobrandsCaddy) do (
  schtasks /end /tn %%t >nul 2>&1
)
timeout /t 2 /nobreak >nul
for %%t in (DecobrandsBackend DecobrandsFrontend) do (
  schtasks /run /tn %%t >nul 2>&1 || (echo Attivita' %%t non trovata: lancia setup.cmd & exit /b 1)
)
rem 20/11/2026: Caddy si ferma e si riavvia come gli altri. Con il solo /run la seconda istanza
rem non trova la porta 8082 libera e muore, e resta in piedi quella vecchia con il Caddyfile vecchio.
rem Non e' fatale: se Caddy non e' una nostra attivita' (servizio di Luis) non c'e' niente da fare.
schtasks /run /tn DecobrandsCaddy >nul 2>&1
exit /b 0
