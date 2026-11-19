@echo off
call "%~dp0node24.bat"
rem Servizio backend (F7-A2): avviato dai servizi Windows, senza finestra.
cd /d "%~dp0..\backend" || exit /b 1
set NODE_ENV=production
node dist\src\main.js
