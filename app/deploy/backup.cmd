@echo off
rem Backup notturno: database + documenti. Attivita' pianificata da setup.cmd (o a mano).
rem RIPRISTINO (a mano, con i servizi fermi):
rem   nssm stop DecobrandsBackend  (oppure schtasks /end /tn DecobrandsBackend)
rem   pg_restore --clean --if-exists --dbname="<DATABASE_URL>" "C:\Decobrands\backup\db-AAAAmmgg-HHMM.dump"
rem   nssm start DecobrandsBackend
setlocal EnableDelayedExpansion
set "ENVFILE=C:\Decobrands\CRM\app\backend\.env"
set "BACKUP=C:\Decobrands\backup"
set "DOCS=C:\Decobrands\documenti"

if not exist "%BACKUP%" mkdir "%BACKUP%"
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set "STAMP=%%d"

where pg_dump >nul 2>&1 || (echo pg_dump non nel PATH & exit /b 1)
set "DBURL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$m=Select-String -LiteralPath '%ENVFILE%' -Pattern '^DATABASE_URL=(.+)$'; if($m){$m.Matches[0].Groups[1].Value.Trim()}"`) do set "DBURL=%%u"
if "!DBURL!"=="" (echo DATABASE_URL non trovato & exit /b 1)

pg_dump --dbname="!DBURL!" --format=custom --file="%BACKUP%\db-%STAMP%.dump" || (echo Backup del database fallito & exit /b 1)
if exist "%DOCS%" robocopy "%DOCS%" "%BACKUP%\documenti" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo Copia dei documenti fallita & exit /b 1)

rem Rotazione: dump piu' vecchi di 14 giorni via
forfiles /p "%BACKUP%" /m db-*.dump /d -14 /c "cmd /c del @path" >nul 2>&1
echo Backup %STAMP% fatto.
exit /b 0
