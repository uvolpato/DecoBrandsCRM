@echo off
rem Espone l'app sulla rete interna SENZA Caddy: il frontend ascolta direttamente sulla 8082.
rem Uso: esponi-in-rete.cmd   (Prompt come amministratore, dal server)
rem Per tornare indietro: cancella C:\Decobrands\frontend.env e riavvia DecobrandsFrontend.
setlocal
set "APP=C:\Decobrands\app"
set "ENVF=C:\Decobrands\frontend.env"

net session >nul 2>&1 || (echo Servono i privilegi di amministratore. & exit /b 1)
if not exist "%APP%\frontend\node_modules" (
  echo Manca la build del frontend: lancia prima setup.cmd.
  exit /b 1
)

> "%ENVF%" echo FRONTEND_HOST=0.0.0.0
>> "%ENVF%" echo FRONTEND_PORTA=8082
echo Scritto %ENVF% (0.0.0.0:8082).

netsh advfirewall firewall delete rule name="Decobrands CRM 8082" >nul 2>&1
netsh advfirewall firewall add rule name="Decobrands CRM 8082" dir=in action=allow protocol=TCP localport=8082 >nul || (
  echo Regola del firewall non creata: aprila a mano per la porta 8082. )

where nssm >nul 2>&1
if not errorlevel 1 (
  nssm restart DecobrandsFrontend >nul 2>&1 || nssm start DecobrandsFrontend >nul 2>&1
) else (
  schtasks /end /tn DecobrandsFrontend >nul 2>&1
  timeout /t 2 /nobreak >nul
  schtasks /run /tn DecobrandsFrontend >nul 2>&1
)

echo.
echo App esposta su http://IP-del-server:8082 (non su 8001, che resta solo su 127.0.0.1).
echo Nel .env metti APP_URL=http://IP-del-server:8082 e riavvia DecobrandsBackend:
echo    C:\Decobrands\app\backend\.env
timeout /t 6 /nobreak >nul
echo Prova in corso...
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP%\deploy\salute.ps1"
if errorlevel 1 (
  echo Il frontend non risponde sulla 8001: controlla il log del servizio.
  exit /b 1
)
exit /b 0
