@echo off
rem Mette davanti al PATH la cartella di Node 24 se quella attiva e' un'altra versione
rem (sul server c'e' anche la 26). Da chiamare con "call node24.bat" da setup.cmd, deploy.cmd
rem e dai due servizio-*.bat: cosi' build e servizi usano sempre la 24 LTS.
for /f "usebackq tokens=1 delims=." %%a in (`node -v 2^>nul`) do if /i "%%a"=="v24" exit /b 0
for /d %%d in ("%ProgramFiles%\nodejs*") do (
  if exist "%%d\node.exe" (
    for /f "usebackq tokens=1 delims=." %%a in (`"%%d\node.exe" -v`) do (
      if /i "%%a"=="v24" set "PATH=%%d;%PATH%"
    )
  )
)
exit /b 0
