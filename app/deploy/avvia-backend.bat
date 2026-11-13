@echo off
rem Backend Nest in esercizio (F7-A2, spec §3.4): ascolta solo su 127.0.0.1:8002.
cd /d "%~dp0..\backend"
set NODE_ENV=production
start "Decobrands backend" cmd /k "npm run start:prod"
