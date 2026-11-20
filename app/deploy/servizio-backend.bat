@echo off
call "%~dp0node24.bat"
rem Servizio backend (F7-A2): avviato dai servizi Windows, senza finestra.
cd /d "%~dp0..\backend" || exit /b 1
rem l'ambiente della macchina non deve vincere sulla .env
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"DATABASE_URL=" "%~dp0..\backend\.env"`) do set "DATABASE_URL=%%b"
set NODE_ENV=production
node dist\src\main.js
