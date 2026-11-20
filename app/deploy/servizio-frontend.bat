@echo off
rem Servizio frontend (F7-A2): avviato dai servizi Windows, senza finestra.
rem Di norma ascolta solo su 127.0.0.1:8001 e dall'esterno si passa da Caddy (porta 8082).
rem Senza Caddy si espone direttamente sulla rete interna: lo fa esponi-in-rete.cmd, che scrive
rem C:\Decobrands\frontend.env con FRONTEND_HOST=0.0.0.0 e FRONTEND_PORTA=8082.
cd /d "%~dp0..\frontend" || exit /b 1
if exist "C:\Decobrands\frontend.env" for /f "usebackq tokens=1,* delims==" %%a in ("C:\Decobrands\frontend.env") do set "%%a=%%b"
if not defined FRONTEND_PORTA set "FRONTEND_PORTA=8001"
if not defined FRONTEND_HOST set "FRONTEND_HOST=127.0.0.1"
set NODE_ENV=production
node node_modules\next\dist\bin\next start -p %FRONTEND_PORTA% -H %FRONTEND_HOST%
