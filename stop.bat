@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM   Enterprise Pilot Stop Script
REM   Usage:
REM     stop.bat   Stop all services
REM ============================================================

cd /d "%~dp0"
set "ROOT=%CD%"
set "PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0;%SystemRoot%\System32;%PATH%"

echo.
echo Stopping Enterprise Pilot services...
echo.

set "STOPPED=0"

REM --- 1. Kill by port: 8080 Java / 8001 Python / 5173 Frontend ---
for %%p in (8080 8001 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        taskkill /pid %%a /f >nul 2>&1
        echo   [OK] Stopped process on port %%p ^(PID %%a^)
        set "STOPPED=1"
    )
)

REM --- 2. Kill orphaned project processes (mvn/java/python/node launched from this project) ---
for /f "tokens=*" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-services.ps1" -Root "%ROOT%"') do (
    echo   [OK] %%a
    set "STOPPED=1"
)

if "%STOPPED%"=="0" (
    echo   No services were running.
) else (
    echo.
    echo All services stopped.
)
echo.
pause
endlocal
