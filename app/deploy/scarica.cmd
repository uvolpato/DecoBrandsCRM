@echo off
rem Aggiorna SOLO app/ dal repository (checkout sparso). Uso: scarica.cmd [tag]
rem   senza tag  -> git pull (ramo corrente)
rem   con tag    -> git fetch --depth 1 origin tag <tag> e checkout di quel rilascio
rem Non scarica mai specifica, piano, preventivo, prototipo, strumenti.
setlocal
set "DEST=C:\Decobrands"
set "REPO=https://github.com/uvolpato/DecoBrandsCRM.git"

if not exist "%DEST%\.git" (
  if exist "%DEST%" (
    dir /b "%DEST%" | findstr . >nul && (
      echo La cartella %DEST% esiste e non e' un repository git.
      echo Svuotala o spostala, poi rilancia questo file.
      exit /b 1
    )
  ) else (
    mkdir "%DEST%" || goto errore
  )
  echo Primo scaricamento in %DEST% ...
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
