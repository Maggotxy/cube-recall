@echo off
title Cube Recall Launcher

echo ========================================
echo   Cube Recall Launcher
echo ========================================
echo.

echo [1/2] Killing all Electron processes...
taskkill /F /IM electron.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo Done: Killed Electron processes
) else (
    echo No Electron process found
)
echo.

echo [2/2] Starting launcher...
echo.

cd /d "%~dp0launcher"
npm run dev

pause
