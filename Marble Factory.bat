@echo off
title Marble & Tiles Factory Suite
echo ====================================================
echo Starting Marble & Tiles Factory Desktop Application
echo ====================================================
echo.

cd /d "%~dp0"
call npm.cmd run electron:dev

pause
