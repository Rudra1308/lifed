@echo off
setlocal
cd /d "%~dp0"
python -m backend.app.notifications.sender >> "%~dp0morning_brief.log" 2>&1
