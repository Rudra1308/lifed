@echo off
title Setup Lifed Morning Brief Schedule
echo ===================================================
echo   Lifed — Morning Brief Automated Scheduler
echo ===================================================
echo.
echo This script registers a daily Windows Task to trigger
echo your Lifed Morning Brief at 09:00 AM sharp even if Lifed is closed.
echo.

set TASK_NAME=LifedMorningBrief
set SCRIPT_DIR=%~dp0
set RUNNER_BAT=%SCRIPT_DIR%run_morning_brief.bat

:: Allow custom time as argument (default: 09:23)
set BRIEF_TIME=%1
if "%BRIEF_TIME%"=="" set BRIEF_TIME=09:23

:: Create the scheduled task to run at specified time daily with exact time precision
schtasks /create /tn "%TASK_NAME%" /tr "%RUNNER_BAT%" /sc daily /st %BRIEF_TIME% /f /ru "%USERNAME%"

if %ERRORLEVEL% equ 0 (
    :: Configure task to run on battery and run immediately if missed
    powershell -NoProfile -Command "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; Set-ScheduledTask -TaskName '%TASK_NAME%' -Settings $settings" >nul 2>&1
    echo.
    echo [SUCCESS] Daily task "%TASK_NAME%" registered successfully for %BRIEF_TIME% sharp!
    echo To test it right now, run: "%RUNNER_BAT%"
) else (
    echo.
    echo [NOTE] If permission was denied, right-click this .bat file and choose 'Run as administrator'.
)

echo.
pause
