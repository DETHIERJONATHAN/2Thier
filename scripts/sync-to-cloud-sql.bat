@echo off
REM Script batch pour planifier la synchronisation avec Task Scheduler
REM Exécute le script PowerShell de synchronisation

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "sync-to-cloud-sql.ps1"
