@echo off
REM Verbose logging is always on; no env vars required.
cd /d "%~dp0..\release\build\win-unpacked"
start "" "%CD%\Captivate 2.exe"
echo Verbose log: %APPDATA%\captivate2\logs\captivate-verbose.ndjson
