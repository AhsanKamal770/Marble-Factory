@echo off
title "Marble & Tiles Factory Suite"
echo ====================================================
echo Starting Marble ^& Tiles Factory Desktop Application
echo ====================================================
echo.

cd /d "%~dp0"

if exist "node_modules\electron\dist\electron.exe" (
  call npm.cmd run electron:dev
) else (
  echo Starting local server and opening Marble Factory...
  start http://localhost:5173
  call npm.cmd run dev
)

pause
