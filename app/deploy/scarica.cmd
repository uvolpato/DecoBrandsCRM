@echo off
rem Aggiorna SOLO app/ dal repository (checkout sparso). Uso: scarica.cmd [tag]
rem   senza tag  -> allinea al ramo main
rem   con tag    -> scarica quel rilascio (es. v0.2.13)
rem Non scarica mai specifica, piano, preventivo, prototipo, strumenti: nel repository
rem il primo checkout avviene DOPO aver impostato il checkout sparso, cosi' gli altri
rem file non arrivano nemmeno sul disco.
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
  git clone --filter=blob:none --no-checkout "%REPO%" "%DEST%" || goto errore
  cd /d "%DEST%" || goto errore
  git sparse-checkout init --no-cone || goto errore
  git sparse-checkout set "app/" || goto errore
  git reset --hard HEAD || goto errore
) else (
  cd /d "%DEST%" || goto errore
  git sparse-checkout set "app/" || goto errore
)

if "%~1"=="" (
  echo Allineamento al ramo main...
  git fetch origin +refs/heads/main:refs/remotes/origin/main || goto errore
  git checkout -f -B live origin/main || goto errore
) else (
  echo Rilascio %~1 ...
  git fetch origin tag %~1 || goto errore
  git checkout -f -B live %~1 || goto errore
)
echo Fatto: & git describe --tags --always
exit /b 0

:errore
echo Scaricamento interrotto.
exit /b 1
