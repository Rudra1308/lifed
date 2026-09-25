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

:: Allow custom time as argument (default: 11:30)
set BRIEF_TIME=%1
if "%BRIEF_TIME%"=="" set BRIEF_TIME=11:30

:: Create the scheduled task to run at specified time daily
schtasks /create /tn "%TASK_NAME%" /tr "%PYTHON_EXE% -m backend.app.notifications.sender" /sc daily /st %BRIEF_TIME% /f /ru "%USERNAME%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Daily task "%TASK_NAME%" registered successfully for %BRIEF_TIME%!
    echo To test it right now, run: python -m backend.app.notifications.sender
) else (
    echo.
    echo [NOTE] If permission was denied, right-click this .bat file and choose 'Run as administrator'.
)

echo.
pause
