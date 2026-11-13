@echo off
rem Avvio in esercizio (F7-A2, spec §3.2): backend sulla 8002 e frontend sulla 8001, poi Caddy
rem davanti (porta 80/443). Prima: deploy\pubblica.bat.
cd /d "%~dp0"
set NODE_ENV=production
call "%~dp0deploy\avvia-backend.bat"
call "%~dp0deploy\avvia-frontend.bat"
cd /d "%~dp0"
start "Decobrands Caddy" cmd /k "caddy run --config deploy\Caddyfile"
