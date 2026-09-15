@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM   Enterprise Pilot Startup Script
REM   Usage:
REM     start.bat             Start all services and open browser
REM     start.bat nobrowser   Start without opening browser
REM     start.bat stop        Stop all services
REM     start.bat help        Show this help
REM ============================================================

cd /d "%~dp0"
set "ROOT=%CD%"
set "JAVA_DIR=%ROOT%\enterprise-pilot-java"
set "PYTHON_DIR=%ROOT%\enterprise-pilot-python"
set "WEB_DIR=%ROOT%\enterprise-pilot-web"
set "LOG_DIR=%ROOT%\runtime-logs"
set "REDIS_CMD="
set "WEB_URL=http://localhost:5173"
set "OPEN_BROWSER=1"

REM Ensure system tools (powershell, netstat, taskkill, where) are available
set "PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0;%SystemRoot%\System32;%PATH%"

if /i "%~1"=="help" goto :show_help
if /i "%~1"=="stop" goto :do_stop
if /i "%~1"=="nobrowser" set "OPEN_BROWSER=0"
goto :do_start

:show_help
echo.
echo   Enterprise Pilot Startup Script
echo.
echo   Usage:
echo     start.bat             Start all services and open browser
echo     start.bat nobrowser   Start without opening browser
echo     start.bat stop        Stop all services
echo     start.bat help        Show this help
echo.
goto :end

REM ============================================================
REM   Stop services
REM ============================================================
:do_stop
echo.
echo Stopping Enterprise Pilot services...
for %%p in (6379 8080 8001 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        taskkill /pid %%a /f >nul 2>&1
        echo   Stopped process on port %%p PID %%a
    )
)
echo.
echo Services stopped.
goto :end

REM ============================================================
REM   Start services
REM ============================================================
:do_start
echo.
echo ========================================
echo   Enterprise Pilot Starting...
echo ========================================
echo.

REM --- Detect tool paths (auto-detect common install locations) ---
call :find_java
call :find_mvn
call :find_node
call :find_python
call :find_redis

if not defined JAVA_CMD (
    echo [ERROR] Java not found. Set JAVA_HOME or add java to PATH
    goto :fail
)
if not defined MVN_CMD (
    echo [ERROR] Maven not found. Set MAVEN_HOME or add mvn to PATH
    goto :fail
)
if not defined NPM_CMD (
    echo [ERROR] Node.js not found. Install Node.js or add npm to PATH
    goto :fail
)
if not defined PYTHON_CMD (
    echo [ERROR] Python 3.11+ not found
    echo        Please install Python 3.11+ and add to PATH
    goto :fail
)
echo [OK] Java: %JAVA_CMD%
echo [OK] Maven: %MVN_CMD%
echo [OK] Node: %NPM_CMD%
echo [OK] Python: %PYTHON_CMD%
if defined REDIS_CMD (
    echo [OK] Redis: %REDIS_CMD%
) else (
    echo [WARN] Redis not found, will skip
)

REM --- Create log directory ---
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM --- Ensure .env files exist ---
if not exist "%JAVA_DIR%\.env" (
    if exist "%JAVA_DIR%\.env.example" (
        copy "%JAVA_DIR%\.env.example" "%JAVA_DIR%\.env" >nul
        echo [WARN] Created enterprise-pilot-java\.env from template, please review
    )
)
if not exist "%PYTHON_DIR%\.env" (
    if exist "%PYTHON_DIR%\.env.example" (
        copy "%PYTHON_DIR%\.env.example" "%PYTHON_DIR%\.env" >nul
        echo [WARN] Created enterprise-pilot-python\.env from template, please review
    )
)

REM --- Load .env files ---
call :load_env "%JAVA_DIR%\.env"
call :load_env "%PYTHON_DIR%\.env"

REM --- Check required env vars ---
set "MISSING_ENV=0"
for %%v in (DB_URL DB_USERNAME DB_PASSWORD JWT_SECRET ZHIPU_API_KEY) do (
    if not defined %%v (
        echo [ERROR] Env var %%v is not set, please configure in .env
        set "MISSING_ENV=1"
    )
)
if "%MISSING_ENV%"=="1" goto :fail

REM --- Check for placeholder values ---
set "PLACEHOLDER_ERR=0"
for %%v in (DB_URL DB_USERNAME DB_PASSWORD JWT_SECRET ZHIPU_API_KEY) do (
    call :check_placeholder %%v
)
if "%PLACEHOLDER_ERR%"=="1" goto :fail
echo [OK] Environment variables check passed

REM --- Check MySQL / Redis ---
call :check_port 127.0.0.1 3306
if errorlevel 1 (
    echo [WARN] MySQL ^(3306^) not reachable, Java backend may fail to start
) else (
    echo [OK] MySQL ^(3306^) reachable
)
call :check_port 127.0.0.1 6379
if errorlevel 1 (
    if defined REDIS_CMD (
        echo   Redis ^(6379^) not reachable, starting Redis...
        start /min "" "%REDIS_CMD%"
        ping -n 3 127.0.0.1 >nul
        call :check_port 127.0.0.1 6379
        if errorlevel 1 (
            echo [WARN] Redis still not reachable after start
        ) else (
            echo [OK] Redis started
        )
    ) else (
        echo [WARN] Redis ^(6379^) not reachable, Java backend may fail to start
    )
) else (
    echo [OK] Redis ^(6379^) reachable
)

REM --- Stop existing processes ---
echo.
echo Cleaning up existing processes...
for %%p in (8080 8001 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        taskkill /pid %%a /f >nul 2>&1
    )
)

REM --- Python virtual environment ---
set "VENV_PY=%PYTHON_DIR%\.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    echo.
    echo Creating Python virtual environment...
    "%PYTHON_CMD%" -m venv "%PYTHON_DIR%\.venv"
    if not exist "%VENV_PY%" (
        echo [ERROR] Failed to create Python virtual environment
        goto :fail
    )
)

REM --- Install Python dependencies ---
if not exist "%PYTHON_DIR%\.venv\Lib\site-packages\fastapi" (
    echo.
    echo Installing Python dependencies, first run may take a few minutes...
    echo   Step 1/2: Installing chroma-hnswlib from prebuilt wheel...
    "%VENV_PY%" -m pip install chroma-hnswlib --only-binary :all: >nul 2>&1
    echo   Step 2/2: Installing remaining dependencies...
    "%VENV_PY%" -m pip install -r "%PYTHON_DIR%\requirements.txt" --only-binary chroma-hnswlib
    if errorlevel 1 (
        echo [ERROR] Python dependency installation failed
        echo        If the error is about C++ build tools or chroma-hnswlib:
        echo        Option A: Install Microsoft C++ Build Tools from:
        echo          https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo        Option B: Install Python 3.12 which has prebuilt wheels
        goto :fail
    )
    echo [OK] Python dependencies installed
)

REM --- Install frontend dependencies ---
if not exist "%WEB_DIR%\node_modules\vite\bin\vite.js" (
    echo.
    echo Installing frontend dependencies, first run may take a few minutes...
    pushd "%WEB_DIR%"
    call "%NPM_CMD%" install
    popd
    if not exist "%WEB_DIR%\node_modules\vite\bin\vite.js" (
        echo [ERROR] Frontend dependency installation failed
        goto :fail
    )
    echo [OK] Frontend dependencies installed
)

REM --- Start Java backend ---
echo.
echo Starting Java backend on port 8080...
powershell -NoProfile -Command "Start-Process -FilePath '%MVN_CMD%' -ArgumentList 'spring-boot:run' -WorkingDirectory '%JAVA_DIR%' -WindowStyle Minimized -RedirectStandardOutput '%LOG_DIR%\java.out.log' -RedirectStandardError '%LOG_DIR%\java.err.log'"

REM --- Start Python AI service ---
echo Starting Python AI service on port 8001...
powershell -NoProfile -Command "Start-Process -FilePath '%VENV_PY%' -ArgumentList '-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8001' -WorkingDirectory '%PYTHON_DIR%' -WindowStyle Minimized -RedirectStandardOutput '%LOG_DIR%\python.out.log' -RedirectStandardError '%LOG_DIR%\python.err.log'"

REM --- Start frontend ---
echo Starting frontend dev server on port 5173...
if defined NODE_DIR (
    powershell -NoProfile -Command "Start-Process -FilePath '%NODE_DIR%\node.exe' -ArgumentList 'node_modules\vite\bin\vite.js' -WorkingDirectory '%WEB_DIR%' -WindowStyle Minimized -RedirectStandardOutput '%LOG_DIR%\web.out.log' -RedirectStandardError '%LOG_DIR%\web.err.log'"
) else (
    powershell -NoProfile -Command "Start-Process -FilePath '%NPM_CMD%' -ArgumentList 'run','dev' -WorkingDirectory '%WEB_DIR%' -WindowStyle Minimized -RedirectStandardOutput '%LOG_DIR%\web.out.log' -RedirectStandardError '%LOG_DIR%\web.err.log'"
)

REM --- Wait for services ---
echo.
echo Waiting for services, first run may take a few minutes for Maven...

echo   [1/4] Waiting for Redis...
call :wait_port 127.0.0.1 6379 10
if errorlevel 1 (
    echo [WARN] Redis did not become ready in time
) else (
    echo   [OK] Redis ready
)

echo   [2/4] Waiting for Java backend...
call :wait_port 127.0.0.1 8080 300
if errorlevel 1 (
    echo [WARN] Java backend did not become ready in time
    call :show_log_tail "%LOG_DIR%\java.err.log"
) else (
    echo   [OK] Java backend ready
)

echo   [3/4] Waiting for Python AI service...
call :wait_http "http://127.0.0.1:8001/health" 120
if errorlevel 1 (
    echo [WARN] Python AI service did not become ready in time
    call :show_log_tail "%LOG_DIR%\python.err.log"
) else (
    echo   [OK] Python AI service ready
)

echo   [4/4] Waiting for frontend...
call :wait_http "%WEB_URL%" 120
if errorlevel 1 (
    echo [WARN] Frontend did not become ready in time
    call :show_log_tail "%LOG_DIR%\web.err.log"
) else (
    echo   [OK] Frontend ready
)

REM --- Open browser ---
if "%OPEN_BROWSER%"=="1" start "" "%WEB_URL%"

echo.
echo ========================================
echo   Enterprise Pilot is running!
echo ========================================
echo   Frontend : %WEB_URL%
echo   Java API : http://127.0.0.1:8080
echo   AI API   : http://127.0.0.1:8001/docs
echo   Logs     : %LOG_DIR%
echo.
echo Run start.bat stop to shut down all services
echo ========================================

goto :end

REM ============================================================
REM   Function: Find Java
REM ============================================================
:find_java
set "JAVA_CMD="
if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
)
if not defined JAVA_CMD (
    for %%c in (java) do (
        where %%c >nul 2>&1
        if not errorlevel 1 set "JAVA_CMD=%%c"
    )
)
goto :eof

REM ============================================================
REM   Function: Find Maven
REM ============================================================
:find_mvn
set "MVN_CMD="
if defined MAVEN_HOME (
    if exist "%MAVEN_HOME%\bin\mvn.cmd" set "MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
)
if not defined MVN_CMD (
    for %%c in (mvn.cmd mvn) do (
        where %%c >nul 2>&1
        if not errorlevel 1 set "MVN_CMD=%%c"
    )
)
REM Fallback: search common user folders for mvn.cmd
if not defined MVN_CMD (
    for %%d in ("%USERPROFILE%\Desktop" "%USERPROFILE%\Downloads" "%USERPROFILE%\Documents") do (
        if not defined MVN_CMD (
            for /f "delims=" %%f in ('dir /b /s "%%~d\mvn.cmd" 2^>nul') do (
                if not defined MVN_CMD set "MVN_CMD=%%f"
            )
        )
    )
)
goto :eof

REM ============================================================
REM   Function: Find Node.js / npm
REM ============================================================
:find_node
set "NODE_DIR="
set "NPM_CMD="
for %%d in ("%ProgramFiles%\nodejs" "%ProgramFiles(x86)%\nodejs" "%LOCALAPPDATA%\Programs\nodejs") do (
    if not defined NODE_DIR (
        if exist "%%~d\npm.cmd" set "NODE_DIR=%%~d"
    )
)
if defined NODE_DIR (
    set "NPM_CMD=%NODE_DIR%\npm.cmd"
) else (
    for %%c in (npm.cmd npm) do (
        where %%c >nul 2>&1
        if not errorlevel 1 set "NPM_CMD=%%c"
    )
)
goto :eof

REM ============================================================
REM   Function: Find Python 3.11+
REM ============================================================
:find_python
set "PYTHON_CMD="
for %%p in (
    "%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "C:\Python314\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
) do (
    if not defined PYTHON_CMD (
        if exist "%%~p" (
            "%%~p" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1
            if not errorlevel 1 set "PYTHON_CMD=%%~p"
        )
    )
)
if not defined PYTHON_CMD (
    for %%c in (py python) do (
        if not defined PYTHON_CMD (
            where %%c >nul 2>&1
            if not errorlevel 1 (
                %%c -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1
                if not errorlevel 1 set "PYTHON_CMD=%%c"
            )
        )
    )
)
goto :eof

REM ============================================================
REM   Function: Load .env file
REM ============================================================
:load_env
if not exist "%~1" goto :eof
for /f "usebackq tokens=1,* delims==" %%a in ("%~1") do (
    set "_line=%%a"
    if not "!_line:~0,1!"=="#" (
        if not "%%a"=="" (
            if not "%%b"=="" set "%%a=%%b"
        )
    )
)
goto :eof

REM ============================================================
REM   Function: Check env var for placeholder
REM ============================================================
:check_placeholder
set "EP_CHECK_VAL=!%~1!"
if not defined EP_CHECK_VAL goto :eof
powershell -NoProfile -Command "if ($env:EP_CHECK_VAL -match 'replace-with|your-|changeme|example') { exit 0 } else { exit 1 }"
if not errorlevel 1 (
    echo [ERROR] Env var %~1 still uses placeholder value, please edit .env
    set "PLACEHOLDER_ERR=1"
)
set "EP_CHECK_VAL="
goto :eof

REM ============================================================
REM   Function: Check TCP port
REM ============================================================
:check_port
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.ConnectAsync('%~1', %~2).Wait(1000) | Out-Null; $c.Close(); exit 0 } catch { exit 1 }"
goto :eof

REM ============================================================
REM   Function: Wait for TCP port (with timeout)
REM ============================================================
:wait_port
powershell -NoProfile -Command "$d = (Get-Date).AddSeconds(%~3); while ((Get-Date) -lt $d) { try { $c = New-Object System.Net.Sockets.TcpClient; $c.ConnectAsync('%~1', %~2).Wait(1000) | Out-Null; $c.Close(); exit 0 } catch {}; Start-Sleep -Seconds 2 }; exit 1"
goto :eof

REM ============================================================
REM   Function: Wait for HTTP ready (with timeout)
REM ============================================================
:wait_http
powershell -NoProfile -Command "$d = (Get-Date).AddSeconds(%~2); while ((Get-Date) -lt $d) { try { $r = Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -lt 500) { exit 0 } } catch { if ($_.Exception.Response) { $s = [int]$_.Exception.Response.StatusCode; if ($s -ge 400 -and $s -lt 500) { exit 0 } } }; Start-Sleep -Seconds 2 }; exit 1"
goto :eof

REM ============================================================
REM   Function: Show log tail
REM ============================================================
:show_log_tail
if not exist "%~1" goto :eof
echo       --- %~nx1 last 10 lines ---
powershell -NoProfile -Command "if (Test-Path '%~1') { Get-Content '%~1' -Tail 10 | ForEach-Object { Write-Host $_ } }"
goto :eof

REM ============================================================
REM   Function: Find Redis
REM ============================================================
:find_redis
set "REDIS_CMD="
if defined REDIS_HOME (
    if exist "%REDIS_HOME%\redis-server.exe" (
        set "REDIS_CMD=%REDIS_HOME%\redis-server.exe"
        goto :eof
    )
    if exist "%REDIS_HOME%\redis-server" (
        set "REDIS_CMD=%REDIS_HOME%\redis-server"
        goto :eof
    )
)
for %%c in (redis-server) do (
    where %%c >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%f in ('where %%c 2^>nul') do (
            if not defined REDIS_CMD set "REDIS_CMD=%%f"
        )
    )
)
for %%p in (
    "C:\Users\zhang\Desktop\Java\redis-server.exe"
    "C:\Program Files\Redis\redis-server.exe"
    "C:\Redis\redis-server.exe"
) do (
    if not defined REDIS_CMD (
        if exist "%%~p" set "REDIS_CMD=%%~p"
    )
)
goto :eof

REM ============================================================
REM   Failure
REM ============================================================
:fail
echo.
echo ========================================
echo   Startup Failed
echo ========================================
echo First-time setup: edit placeholders in:
echo   enterprise-pilot-java\.env
echo   enterprise-pilot-python\.env
echo.
pause
exit /b 1

:end
endlocal
