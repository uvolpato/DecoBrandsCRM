@echo off
call "%~dp0node24.bat"
rem Servizio frontend (F7-A2): avviato dai servizi Windows, senza finestra, solo su 127.0.0.1.
cd /d "%~dp0..\frontend" || exit /b 1
set NODE_ENV=production
node node_modules\next\dist\bin\next start -p 8001 -H 127.0.0.1
