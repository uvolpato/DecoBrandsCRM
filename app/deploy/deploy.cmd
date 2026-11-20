@echo off
rem Aggiornamento del CRM (uso: deploy.cmd v0.2.14, oppure doppio click = ultima versione di main).
rem Fa: copia del .env, backup del database e dei documenti, scarica SOLO app/ a quel tag,
rem npm ci + build + migrazioni, riavvio dei servizi, prova di salute; se non risponde torna
rem al rilascio precedente.
setlocal EnableDelayedExpansion
rem PostgreSQL fuori dal PATH: si cerca la cartella di installazione e la si aggiunge solo a questa
rem sessione (serve pg_dump per il backup e, in setup, per le migrazioni)
where pg_dump >nul 2>&1 || (
  for /d %%v in ("C:\Program Files\PostgreSQL\*") do if exist "%%v\bin\pg_dump.exe" set "PGPATH=%%v\bin"
  if defined PGPATH set "PATH=!PGPATH!;!PATH!"
)
cd /d "%~dp0.." || exit /b 1
set "APP=%CD%"
set "CONFIG=C:\Decobrands\config"
set "BACKUP=C:\Decobrands\backup"
set "DOCS=C:\Decobrands\documenti"
set "LOG=C:\Decobrands\log"
set "MANUT=C:\Decobrands\manutenzione.txt"
set "ENVFILE=%APP%\backend\.env"
set "TAG=%~1"

rem 20/11/2026: i servizi sono attivita' pianificate e schtasks, senza privilegi, risponde "Accesso
rem negato" (visto sul server). Se non siamo amministratori ci si rialza da soli, una volta sola: il
rem figlio eredita DECOBRANDS_AMMIN e non si entra in un ciclo di finestre.
net session >nul 2>&1
if errorlevel 1 if not defined DECOBRANDS_AMMIN (
  echo Servono i privilegi di amministratore: chiedo la conferma...
  set "DECOBRANDS_AMMIN=1"
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' %* -Verb RunAs"
  exit /b
)

call "%~dp0node24.bat"
rem Doppio click (nessun argomento): ultima versione di main, con la finestra aperta alla fine.
rem Il richiamo di se stesso serve a un solo "pause": vale anche per le uscite d'errore.
if "%TAG%"=="" (
  call "%~f0" main
  pause
  exit /b
)
if /i "%TAG%"=="main" (set "RIF=origin/main") else (set "RIF=%TAG%")

for %%d in ("%CONFIG%" "%BACKUP%" "%LOG%") do if not exist %%d mkdir %%d
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set "STAMP=%%d"
set "TRACCIA=%BACKUP%\deploy.log"

echo [%STAMP%] deploy %TAG% da %USERNAME%>>"%TRACCIA%"

echo == 1. Copia del .env (fuori dal repository)
if exist "%ENVFILE%" (copy /y "%ENVFILE%" "%CONFIG%\backend.env" >nul)
rem DATABASE_URL della .env vince su una variabile d'ambiente gia' presente nel sistema (dotenv non la sovrascrive)
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"DATABASE_URL=" "%ENVFILE%"`) do set "DATABASE_URL=%%b"

echo == 2. Rilascio attuale (per il ritorno indietro)
set "PRIMA="
for /f "usebackq delims=" %%t in (`git -C "%APP%\.." describe --tags --abbrev=0 2^>nul`) do set "PRIMA=%%t"
echo Attuale: !PRIMA!  Nuovo: %TAG%

echo == 3. Backup del database e dei documenti
where pg_dump >nul 2>&1 || (echo pg_dump non nel PATH: mi fermo, il backup del database e' obbligatorio. & exit /b 1)
set "DBURL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$m=Select-String -LiteralPath '%ENVFILE%' -Pattern '^DATABASE_URL=(.+)$'; if($m){$m.Matches[0].Groups[1].Value.Trim()}"`) do set "DBURL=%%u"
if "!DBURL!"=="" (echo DATABASE_URL non trovato nel .env: mi fermo. & exit /b 1)
rem 20/11/2026: nella .env il DATABASE_URL finisce con ?schema=public, che e' un parametro di Prisma e
rem pg_dump lo rifiuta ("invalid URI query parameter"). Si taglia via tutto cio' che segue il punto
rem interrogativo; va bene finche' non servono altri parametri (sslmode & co.).
for /f "tokens=1 delims=?" %%q in ("!DBURL!") do set "DBURL=%%q"
pg_dump --dbname="!DBURL!" --format=custom --file="%BACKUP%\db-%STAMP%.dump" || (echo Backup del database fallito: mi fermo. & exit /b 1)
if exist "%DOCS%" robocopy "%DOCS%" "%BACKUP%\documenti" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo Copia dei documenti fallita: mi fermo. & exit /b 1)

echo == 4. Scarico solo app/ a %TAG%
set "SCARICA=%TAG%"
if /i "%TAG%"=="main" set "SCARICA="
call "%APP%\deploy\scarica.cmd" %SCARICA% || goto fallito

echo == 5. Dipendenze (solo se i lockfile cambiano), migrazioni, build
rem 20/11/2026: i servizi in corsa tengono aperti i file di node_modules e .next (npm ci -> EPERM):
rem si fermano prima di toccarli. Il ritorno indietro passa di qui una seconda volta.
rem Dal deploy del portale Luis: mentre i servizi sono fermi Caddy mostra la pagina di cortesia.
if not exist "C:\Decobrands" mkdir "C:\Decobrands" >nul 2>&1
echo manutenzione>"%MANUT%"
call "%APP%\deploy\ferma-servizi.cmd"
set "LOCK="
if defined PRIMA for /f "usebackq delims=" %%f in (`git -C "%APP%\.." diff --name-only %PRIMA% %RIF% -- app/backend/package-lock.json app/frontend/package-lock.json 2^>nul`) do set "LOCK=1"

cd /d "%APP%\backend" || goto fallito
if not exist node_modules set "LOCK=1"
if defined LOCK (
  call npm ci --no-audit --no-fund || goto fallito
) else (
  echo package-lock invariato: salto npm ci del backend.
)
call npx prisma generate || goto fallito
call npm run build || goto fallito
call npx prisma migrate deploy || (echo Migrazioni fallite. Il dump e' in %BACKUP%. & goto fallito)

cd /d "%APP%\frontend" || goto fallito
if not exist node_modules set "LOCK=1"
if defined LOCK (
  call npm ci --no-audit --no-fund || goto fallito
) else (
  echo package-lock invariato: salto npm ci del frontend.
)
call npm run build || goto fallito

echo == 6. Riavvio e prova di salute
call "%APP%\deploy\avvia-servizi.cmd" || goto fallito
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP%\deploy\salute.ps1" || goto fallito
del "%MANUT%" >nul 2>&1

echo [%STAMP%] deploy %TAG% completato>>"%TRACCIA%"
echo.
echo Rilasciato %TAG%. App su http://localhost:8001 (pubblico da Caddy).
exit /b 0

:fallito
echo.
echo *** Deploy di %TAG% non riuscito ***
echo [%STAMP%] deploy %TAG% FALLITO>>"%TRACCIA%"
if "!PRIMA!"=="" (echo Nessun rilascio precedente noto: fermati e guarda i log in %LOG%. & exit /b 1)
echo Torno a !PRIMA! ...
call "%APP%\deploy\scarica.cmd" !PRIMA! || (echo Ritorno indietro non riuscito. & exit /b 1)
cd /d "%APP%\backend" && call npm ci && call npx prisma generate && call npm run build
cd /d "%APP%\frontend" && call npm ci && call npm run build
call "%APP%\deploy\avvia-servizi.cmd"
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP%\deploy\salute.ps1" || (
  echo Anche !PRIMA! non risponde: la pagina di cortesia resta attiva e i servizi potrebbero essere fermi.
  echo Avviali con "%APP%\deploy\avvia-servizi.cmd"; quando l'app risponde togli la cortesia:
  echo   del "%MANUT%"
  echo Il dump per il database e' in %BACKUP%; chiama aiuto prima di riprovare.
  exit /b 1)
del "%MANUT%" >nul 2>&1
echo [%STAMP%] tornato a !PRIMA!>>"%TRACCIA%"
echo Tornato a !PRIMA!. Se nel frattempo erano girate migrazioni, il database ha la struttura nuova:
echo il dump %BACKUP%\db-%STAMP%.dump serve per ripristinarlo.
exit /b 1
