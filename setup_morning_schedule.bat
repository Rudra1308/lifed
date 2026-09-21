@echo off
title Setup Lifed Morning Brief Schedule
echo ===================================================
echo   Lifed — Morning Brief Automated Scheduler
echo ===================================================
echo.
echo This script registers a daily Windows Task to trigger
echo your Lifed Morning Brief at 08:00 AM even if Lifed is closed.
echo.

set TASK_NAME=LifedMorningBrief
set PYTHON_EXE=python
set SCRIPT_DIR=%~dp0

:: Create the scheduled task to run at 8:00 AM daily
schtasks /create /tn "%TASK_NAME%" /tr "%PYTHON_EXE% -m backend.app.notifications.sender" /sc daily /st 08:00 /f /ru "%USERNAME%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Daily task "%TASK_NAME%" registered successfully for 08:00 AM!
    echo To test it right now, run: python -m backend.app.notifications.sender
) else (
    echo.
    echo [NOTE] If permission was denied, right-click this .bat file and choose 'Run as administrator'.
)

echo.
pause
