@echo off
rem Avvio in sviluppo: backend sulla 8002, frontend sulla 8001 (spec §3.2). Apri http://localhost:8001
cd /d "%~dp0"
start "Decobrands backend" cmd /k "cd backend && npm run start:dev"
start "Decobrands frontend" cmd /k "cd frontend && npm run dev"
