@echo off
rem Frontend Next in esercizio (F7-A2, spec §3.4): ascolta solo su 127.0.0.1:8001.
cd /d "%~dp0..\frontend"
start "Decobrands frontend" cmd /k "npm start"
