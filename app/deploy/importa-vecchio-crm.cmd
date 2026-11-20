@echo off
rem Import del vecchio CRM in esercizio: backup, prova a vuoto, import, storico dei legami.
rem I dati NON sono nel repository (dati-crm-legacy e' in .gitignore): vanno copiati a mano
rem nella radice, accanto ad app\. File attesi dentro dati-crm-legacy:
rem   clienti.jsonl fornitori.json subagenti.json agenti.json gruppi.json settori.json
rem   collegamenti.csv contatti_clienti.csv
rem Uso, da cmd.exe:  C:\Decobrands\app\deploy\importa-vecchio-crm.cmd
rem Rilanciabile: --aggiungi non cancella e non modifica quello che c'e' (D-102, D-112).
setlocal EnableDelayedExpansion

set "BACK=%~dp0..\backend"
set "RADICE=%~dp0..\.."
set "DATI=%RADICE%\dati-crm-legacy"

echo == 1. Dati del vecchio CRM
if not exist "%DATI%" (
  echo Mancano i dati: copia la cartella dati-crm-legacy in %RADICE%
  goto errore
)
set "MANCA="
for %%f in (clienti.jsonl fornitori.json subagenti.json agenti.json gruppi.json settori.json collegamenti.csv contatti_clienti.csv) do (
  if not exist "%DATI%\%%f" set "MANCA=%DATI%\%%f"
)
if defined MANCA (echo Manca il file !MANCA! & goto errore)
echo Dati trovati in %DATI%

cd /d "%BACK%" || goto errore
where npm >nul 2>&1 || (echo npm non nel PATH: lancia prima node24.bat & goto errore)
if not exist "node_modules" (
  echo Primo giro: installo le dipendenze del backend
  call npm ci --no-audit --no-fund || goto errore
)

echo.
echo == 2. Backup del database
call "%~dp0backup.cmd" || (echo Backup non riuscito: mi fermo & goto errore)

echo.
echo == 3. Prova a vuoto (una transazione, poi torna indietro: non scrive niente)
call npm run import:vecchio-crm -- --db decobrands_db --aggiungi --correggi-date --prova || goto errore

echo.
set "RISPOSTA="
set /p RISPOSTA=Se i numeri tornano scrivi SI e premi Invio per importare davvero: 
if /i not "!RISPOSTA!"=="SI" (echo Import annullato. & goto fine)

echo.
echo == 4. Import (una sola transazione)
call npm run import:vecchio-crm -- --db decobrands_db --aggiungi --correggi-date || goto errore

echo.
echo == 5. Storico dei legami del vecchio CRM
call npm run import:storico || goto errore

echo.
echo Fatto. Report in %DATI%\import\: import-riepilogo.json, da-inserire-in-integra.csv.
echo Non serve riavviare: sono solo dati.
goto fine

:errore
echo.
echo *** Non riuscito: guarda il messaggio qui sopra. Il database non e' stato toccato
echo *** (prova e import girano in una sola transazione).
:fine
echo.
pause
endlocal
