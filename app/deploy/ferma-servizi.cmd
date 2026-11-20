@echo off
rem Ferma backend e frontend prima di installare dipendenze o ricostruire: i processi tengono aperti
rem i file di node_modules/.next e npm (o next build) non riesce a sovrascriverli (EPERM).
rem Lo chiamano setup.cmd e deploy.cmd; i servizi li riavvia avvia-servizi.cmd.
where nssm >nul 2>&1
if not errorlevel 1 (
  nssm stop DecobrandsFrontend >nul 2>&1
  nssm stop DecobrandsBackend >nul 2>&1
) else (
  for %%t in (DecobrandsFrontend DecobrandsBackend) do schtasks /end /tn %%t >nul 2>&1
)
rem il tempo di chiudere i file
timeout /t 3 /nobreak >nul
exit /b 0
