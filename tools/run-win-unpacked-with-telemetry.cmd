@echo off
set CAPTIVATE_TELEMETRY_LIVE_LOG=1
cd /d "%~dp0..\release\build\win-unpacked"
start "" "%CD%\Captivate 2.exe"
