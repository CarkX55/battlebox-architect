@echo off
cd /d "%~dp0"
:npm_run_dev
npm run dev
timeout /t 3 /nobreak >nul
goto npm_run_dev