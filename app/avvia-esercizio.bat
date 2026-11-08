@echo off
rem Avvio in esercizio (F7-A2, spec §3.2): backend sulla 8002 e frontend sulla 8001, poi Caddy
rem davanti (porta 80). Prima: npm run build in backend e frontend.
cd /d "%~dp0"
set NODE_ENV=production
start "Decobrands backend" cmd /k "cd backend && npm run start:prod"
start "Decobrands frontend" cmd /k "cd frontend && npm start"
start "Decobrands Caddy" cmd /k "caddy run --config deploy\Caddyfile"
