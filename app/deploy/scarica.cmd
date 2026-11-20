@echo off
rem Aggiorna SOLO app/ dal repository (checkout sparso). Uso: scarica.cmd [tag]
rem   senza tag  -> allinea al ramo main
rem   con tag    -> scarica quel rilascio (es. v0.2.13)
rem Non scarica mai specifica, piano, preventivo, prototipo, strumenti: nel repository
rem il primo checkout avviene DOPO aver impostato il checkout sparso, cosi' gli altri
rem file non arrivano nemmeno sul disco.
setlocal EnableDelayedExpansion
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
  rem 20/11/2026: --tags perche' il ritorno indietro di deploy.cmd si regge sui tag (git describe):
  rem senza, su un clone senza tag "Attuale:" restava vuoto e il ritorno indietro non era disponibile.
  rem --force perche' un tag locale spostato (o scaricato a meta') fa fallire il fetch con
  rem "would clobber existing tag": sul server i tag devono combaciare con origin, punto.
  git fetch --force --tags origin +refs/heads/main:refs/remotes/origin/main || goto errore
  git checkout -f -B live origin/main || goto errore
) else (
  echo Rilascio %~1 ...
  git fetch --force origin tag %~1 || goto errore
  git checkout -f -B live %~1 || goto errore
)
rem Controllo: nella radice devono stare solo .git, app\ e le cartelle dati che setup.cmd crea lì
rem (config, backup, documenti, log). Se c'e' altro, si riapplica il checkout sparso; se resta
rem ancora, ci si ferma invece di pubblicare un albero sbagliato.
set "RADICE=.git app config backup documenti log"
set "EXTRA="
for /f "delims=" %%f in ('dir /b /a "%DEST%" ^| findstr /v /i /x "%RADICE%"') do set "EXTRA=%%f"
if defined EXTRA (
  echo Trovato nella radice qualcosa che non serve: !EXTRA!
  git sparse-checkout reapply >nul 2>&1
  set "EXTRA="
  for /f "delims=" %%f in ('dir /b /a "%DEST%" ^| findstr /v /i /x "%RADICE%"') do set "EXTRA=%%f"
  if defined EXTRA (
    echo Il checkout sparso non e' a posto: fermati e controlla a mano %DEST%.
    exit /b 1
  )
)

echo Fatto: & git describe --tags --always
exit /b 0

:errore
echo Scaricamento interrotto.
exit /b 1
