@echo off
rem Aggiorna SOLO app/ dal repository (checkout sparso). Uso: scarica.cmd [tag]
rem   senza tag  -> git pull (ramo corrente)
rem   con tag    -> git fetch --depth 1 origin tag <tag> e checkout di quel rilascio
rem Non scarica mai specifica, piano, preventivo, prototipo, strumenti.
setlocal
set "DEST=C:\Decobrands\CRM"
set "REPO=https://github.com/uvolpato/DecoBrandsCRM.git"

if not exist "%DEST%\.git" (
  echo Primo scaricamento in %DEST% ...
  if not exist "%DEST%" mkdir "%DEST%"
  git clone --filter=blob:none --sparse "%REPO%" "%DEST%" || goto errore
)

cd /d "%DEST%" || goto errore
git sparse-checkout set --no-cone "app/" || goto errore

if "%~1"=="" (
  echo Aggiornamento del ramo corrente...
  git pull --ff-only || goto errore
  echo Fatto. Versione: & git describe --tags --always
  exit /b 0
)

echo Rilascio %~1 ...
git fetch --depth 1 origin tag %~1 || goto errore
git checkout -f -B live %~1 || goto errore
echo Fatto. Versione: & git describe --tags --always
exit /b 0

:errore
echo Scaricamento interrotto.
exit /b 1
