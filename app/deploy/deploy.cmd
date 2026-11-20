@echo off
rem Aggiornamento del CRM su un rilascio (uso: deploy.cmd v0.2.13).
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
set "ENVFILE=%APP%\backend\.env"
set "TAG=%~1"

call "%~dp0node24.bat"
if "%TAG%"=="" (
  echo Uso: deploy.cmd ^<tag^>     es. deploy.cmd v0.2.13
  echo I tag sono i rilasci: git tag --list "v*"
  exit /b 1
)

for %%d in ("%CONFIG%" "%BACKUP%" "%LOG%") do if not exist %%d mkdir %%d
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set "STAMP=%%d"
set "TRACCIA=%BACKUP%\deploy.log"

echo [%STAMP%] deploy %TAG% da %USERNAME%>>"%TRACCIA%"

echo == 1. Copia del .env (fuori dal repository)
if exist "%ENVFILE%" (copy /y "%ENVFILE%" "%CONFIG%\backend.env" >nul)

echo == 2. Rilascio attuale (per il ritorno indietro)
set "PRIMA="
for /f "usebackq delims=" %%t in (`git -C "%APP%\.." describe --tags --abbrev=0 2^>nul`) do set "PRIMA=%%t"
echo Attuale: !PRIMA!  Nuovo: %TAG%

echo == 3. Backup del database e dei documenti
where pg_dump >nul 2>&1 || (echo pg_dump non nel PATH: mi fermo, il backup del database e' obbligatorio. & exit /b 1)
set "DBURL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$m=Select-String -LiteralPath '%ENVFILE%' -Pattern '^DATABASE_URL=(.+)$'; if($m){$m.Matches[0].Groups[1].Value.Trim()}"`) do set "DBURL=%%u"
if "!DBURL!"=="" (echo DATABASE_URL non trovato nel .env: mi fermo. & exit /b 1)
pg_dump --dbname="!DBURL!" --format=custom --file="%BACKUP%\db-%STAMP%.dump" || (echo Backup del database fallito: mi fermo. & exit /b 1)
if exist "%DOCS%" robocopy "%DOCS%" "%BACKUP%\documenti" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo Copia dei documenti fallita: mi fermo. & exit /b 1)

echo == 4. Scarico solo app/ al rilascio %TAG%
call "%APP%\deploy\scarica.cmd" %TAG% || goto fallito

echo == 5. Dipendenze (solo se i lockfile cambiano), migrazioni, build
set "LOCK="
if defined PRIMA for /f "usebackq delims=" %%f in (`git -C "%APP%\.." diff --name-only %PRIMA% %TAG% -- app/backend/package-lock.json app/frontend/package-lock.json 2^>nul`) do set "LOCK=1"

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
  echo Anche !PRIMA! non risponde: ripristina il database con il dump in %BACKUP% e chiama aiuto.
  exit /b 1)
echo [%STAMP%] tornato a !PRIMA!>>"%TRACCIA%"
echo Tornato a !PRIMA!. Se nel frattempo erano girate migrazioni, il database ha la struttura nuova:
echo il dump %BACKUP%\db-%STAMP%.dump serve per ripristinarlo.
exit /b 1
