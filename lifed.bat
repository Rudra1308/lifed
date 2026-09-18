@echo off
title Lifed AI Command Center
echo ===================================================
echo   Lifed — Personal AI Command Center (Desktop)
echo ===================================================
echo.

cd /d "%~dp0"

:: Check if desktop dependencies are installed
if not exist "desktop\node_modules" (
    echo [Setup] Installing desktop shell dependencies...
    cd desktop
    call npm install
    cd ..
)

echo [Lifed] Starting Lifed Desktop Application...
cd desktop
call npm start
