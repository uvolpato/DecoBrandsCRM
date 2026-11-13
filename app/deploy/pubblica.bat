@echo off
rem Pubblicazione (F7-A2, spec §3.4): tiene solo app/ sul server, aggiorna e ricostruisce.
rem Da fermare prima backend e frontend. Al primo scaricamento vedere README (sparse checkout).
cd /d "%~dp0.."
rem Niente NODE_ENV=production qui: npm ci deve installare anche le dipendenze di sviluppo (build, prisma).
git sparse-checkout set --no-cone "app/" || goto errore
git pull || goto errore
cd backend || goto errore
call npm ci || goto errore
call npx prisma migrate deploy || goto errore
call npm run build || goto errore
cd ..\frontend || goto errore
call npm ci || goto errore
call npm run build || goto errore
echo Pubblicazione completata. Riavvia con avvia-esercizio.bat.
exit /b 0

:errore
echo Pubblicazione interrotta.
exit /b 1
