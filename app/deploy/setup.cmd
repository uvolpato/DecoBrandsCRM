@echo off
rem Installazione del CRM sul server (una volta sola, come amministratore).
rem Prerequisiti da installare a mano: Node 24, Git, PostgreSQL, LibreOffice, Caddy, NSSM (facoltativo).
rem Uso: setup.cmd
setlocal EnableDelayedExpansion
rem Strumenti fuori dal PATH: si cercano nelle cartelle di installazione abituali e si aggiungono
rem solo a questa sessione (pg_dump per migrazioni e backup, caddy per il sito, soffice per i PDF)
where pg_dump >nul 2>&1 || (
  for /d %%v in ("%ProgramFiles%\PostgreSQL\*") do if exist "%%v\bin\pg_dump.exe" set "PATH=%%v\bin;!PATH!"
)
where caddy >nul 2>&1 || (
  for %%c in ("C:\caddy\caddy.exe" "%ProgramFiles%\Caddy\caddy.exe" "%ProgramData%\chocolatey\bin\caddy.exe") do (
    if exist %%c set "PATH=%%~dpc;!PATH!"
  )
)
where soffice >nul 2>&1 || (
  if exist "%ProgramFiles%\LibreOffice\program\soffice.exe" set "PATH=%ProgramFiles%\LibreOffice\program;!PATH!"
)
cd /d "%~dp0.." || exit /b 1
set "APP=%CD%"
set "CONFIG=C:\Decobrands\config"
set "BACKUP=C:\Decobrands\backup"
set "DOCS=C:\Decobrands\documenti"
set "LOG=C:\Decobrands\log"
set "ENVFILE=%APP%\backend\.env"

call "%~dp0node24.bat"
net session >nul 2>&1 || (echo Servono i privilegi di amministratore: apri il Prompt come amministratore. & exit /b 1)

echo == 1. Prerequisiti
for %%c in (git node npm) do (
  where %%c >nul 2>&1 || (echo MANCA %%c nel PATH. & exit /b 1)
)
node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0]===24 && v[1]>=15 ? 0 : 1)" || (
  echo Serve Node 24 LTS ^(24.15 o successivo^): la 26 non e' supportata da Prisma 7.
  echo Installa la 24 LTS da https://nodejs.org/en/download e riapri il Prompt. & exit /b 1)
where pg_dump >nul 2>&1 || echo ATTENZIONE: pg_dump non nel PATH: backup e migrazioni da controllare.
where caddy  >nul 2>&1 || echo ATTENZIONE: caddy non nel PATH: il sito non avra' il certificato.
where soffice >nul 2>&1 || echo ATTENZIONE: soffice non nel PATH: il PDF delle liquidazioni non funzionera'.
set "NSSM="
where nssm >nul 2>&1 && set "NSSM=1"

echo == 2. Cartelle
for %%d in ("%CONFIG%" "%BACKUP%" "%DOCS%" "%LOG%") do if not exist %%d mkdir %%d

echo == 3. Variabili d'ambiente
if exist "%ENVFILE%" (
  echo .env gia' presente: lo tengo e ne faccio una copia in %CONFIG%
) else (
  set "DECO_DBURL="
  set /p DECO_DBURL=Database ^(postgresql://utente:password@localhost:5432/decobrands_db?schema=public^): 
  if "!DECO_DBURL!"=="" set "DECO_DBURL=postgresql://decobrands:password@localhost:5432/decobrands_db?schema=public"
  set "DECO_APPURL="
  set /p DECO_APPURL=Indirizzo con cui si apre l'app ^(in intranet: http://IP-del-server o http://crm.decobrands.local^) [https://crm.decobrands.it]: 
  if "!DECO_APPURL!"=="" set "DECO_APPURL=https://crm.decobrands.it"
  set "DECO_APP=%APP%"
  set "DECO_DOCS=%DOCS%"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%APP%\deploy\scrivi-env.ps1" || (echo Scrittura del .env non riuscita. & exit /b 1)
)
copy /y "%ENVFILE%" "%CONFIG%\backend.env" >nul

echo == 4. Backend: dipendenze, build, migrazioni
cd /d "%APP%\backend" || exit /b 1
call npm ci || (echo npm ci backend fallito. & exit /b 1)
call npx prisma generate || (echo generazione del client Prisma fallita. & exit /b 1)
call npm run build || (echo build backend fallito. & exit /b 1)
call npx prisma migrate deploy || (echo migrazioni fallite: controlla DATABASE_URL nel .env. & exit /b 1)

echo == 5. Primo utente (superutente)
set /p UTENTE=Nome utente del superutente: 
set /p EMAIL=Email: 
set /p NOME=Nome e cognome: 
call npm run superutente -- "!UTENTE!" "!EMAIL!" "!NOME!" || (echo Creazione del superutente fallita. & exit /b 1)

echo == 6. Frontend: dipendenze e build
cd /d "%APP%\frontend" || exit /b 1
call npm ci || (echo npm ci frontend fallito. & exit /b 1)
call npm run build || (echo build frontend fallito. & exit /b 1)

echo == 7. Servizi Windows
if defined NSSM goto servizi-nssm
echo NSSM non trovato: uso le attivita' pianificate all'avvio.
schtasks /create /f /tn DecobrandsBackend  /sc onstart /ru SYSTEM /rl HIGHEST /tr "%APP%\deploy\servizio-backend.bat"  >nul || goto servizierrore
schtasks /create /f /tn DecobrandsFrontend /sc onstart /ru SYSTEM /rl HIGHEST /tr "%APP%\deploy\servizio-frontend.bat" >nul || goto servizierrore
powershell -NoProfile -Command "Get-ScheduledTask -TaskName 'Decobrands*' | ForEach-Object { $_.Settings.ExecutionTimeLimit='PT0S'; Set-ScheduledTask -TaskName $_.TaskName -Settings $_.Settings | Out-Null }"
goto caddy

:servizi-nssm
nssm install DecobrandsBackend  "cmd.exe" "/c %APP%\deploy\servizio-backend.bat"  >nul  || goto servizierrore
nssm set DecobrandsBackend  AppDirectory "%APP%\backend"  >nul
nssm set DecobrandsBackend  Start SERVICE_AUTO_START >nul
nssm set DecobrandsBackend  AppStdout "%LOG%\backend.log"  >nul
nssm set DecobrandsBackend  AppStderr "%LOG%\backend-err.log" >nul
nssm install DecobrandsFrontend "cmd.exe" "/c %APP%\deploy\servizio-frontend.bat" >nul  || goto servizierrore
nssm set DecobrandsFrontend AppDirectory "%APP%\frontend" >nul
nssm set DecobrandsFrontend Start SERVICE_AUTO_START >nul
nssm set DecobrandsFrontend AppStdout "%LOG%\frontend.log" >nul
nssm set DecobrandsFrontend AppStderr "%LOG%\frontend-err.log" >nul

:caddy
echo == 8. Caddy
where caddy >nul 2>&1 || goto backup-task
sc query Caddy >nul 2>&1
if not errorlevel 1 (
  echo Caddy e' gia' un servizio di questo server ^(probabilmente per Luis^).
  echo NON lo tocco: aggiungi a mano il blocco di deploy\Caddyfile al Caddyfile esistente e ricarica Caddy.
  goto backup-task
)
if defined NSSM (
  nssm install DecobrandsCaddy "caddy.exe" "run --config %APP%\deploy\Caddyfile" >nul
  nssm set DecobrandsCaddy Start SERVICE_AUTO_START >nul
) else (
  schtasks /create /f /tn DecobrandsCaddy /sc onstart /ru SYSTEM /rl HIGHEST /tr "caddy.exe run --config %APP%\deploy\Caddyfile" >nul
)

:backup-task
echo == 9. Backup notturno (02:00)
schtasks /create /f /tn DecobrandsBackup /sc daily /st 02:00 /ru SYSTEM /rl HIGHEST /tr "%APP%\deploy\backup.cmd" >nul

echo == 10. Avvio e prova di salute
call "%APP%\deploy\avvia-servizi.cmd" || goto servizierrore
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP%\deploy\salute.ps1" || (
  echo L'app non risponde. Ultime righe del log:
  powershell -NoProfile -Command "Get-Content '%LOG%\backend-err.log' -Tail 30 -ErrorAction SilentlyContinue"
  exit /b 1)

echo.
echo Installazione completata. Apri l'indirizzo pubblico (o http://localhost:8001).
echo Aggiornamenti: deploy.cmd ^<tag^>    Backup a mano: backup.cmd
exit /b 0

:servizierrore
echo Creazione dei servizi non riuscita. Controlla di aver aperto il Prompt come amministratore.
exit /b 1
