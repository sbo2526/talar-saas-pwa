@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "TASK_ID=TALAR_DEV_CACHE_SAFE_RUNNER_V2"
set "PROJECT=%~dp0"
set "PROJECT=%PROJECT:~0,-1%"
set "PORT=3000"
set "HOST=0.0.0.0"
set "APP_URL=http://localhost:%PORT%/login"
set "RESET_NEXT_CACHE=0"
set "RESET_BROWSER_PROFILE=1"
set "RUN_STAMP=%DATE%_%TIME%"
set "RUN_STAMP=%RUN_STAMP:/=-%"
set "RUN_STAMP=%RUN_STAMP::=-%"
set "RUN_STAMP=%RUN_STAMP:.=-%"
set "RUN_STAMP=%RUN_STAMP: =_%"
set "POWERSHELL_ROOT=C:\Projects\PowerShell"
set "REPORT_ROOT=%POWERSHELL_ROOT%\Reports\%TASK_ID%_%RUN_STAMP%"
set "OUTPUT_ROOT=%POWERSHELL_ROOT%\Output"
set "LOG=%REPORT_ROOT%\runner.log"
set "BROWSER_PROFILE=%LOCALAPPDATA%\TalarSaasPwa\CacheSafeBrowserProfileV2"

if not exist "%REPORT_ROOT%" mkdir "%REPORT_ROOT%" >nul 2>&1
if not exist "%OUTPUT_ROOT%" mkdir "%OUTPUT_ROOT%" >nul 2>&1

(
  echo # Environment Report
  echo TaskId: %TASK_ID%
  echo CurrentUser: %USERNAME%
  echo ComputerName: %COMPUTERNAME%
  echo UserProfile: %USERPROFILE%
  echo Downloads: %USERPROFILE%\Downloads
  echo ProjectRoot: %PROJECT%
  echo PowerShellRoot: %POWERSHELL_ROOT%
  echo ReportRoot: %REPORT_ROOT%
  echo OutputRoot: %OUTPUT_ROOT%
  echo BrowserProfile: %BROWSER_PROFILE%
  echo Port: %PORT%
  echo Host: %HOST%
  echo AppUrl: %APP_URL%
  echo ResetNextCache: %RESET_NEXT_CACHE%
  echo ResetBrowserProfile: %RESET_BROWSER_PROFILE%
) > "%REPORT_ROOT%\00_ENVIRONMENT_REPORT.md"

echo ========================================== > "%LOG%"
echo Talar Dev Cache-Safe Runner V2 >> "%LOG%"
echo ========================================== >> "%LOG%"
echo CurrentUser: %USERNAME% >> "%LOG%"
echo ComputerName: %COMPUTERNAME% >> "%LOG%"
echo ProjectRoot: %PROJECT% >> "%LOG%"
echo BrowserProfile: %BROWSER_PROFILE% >> "%LOG%"
echo ResetNextCache: %RESET_NEXT_CACHE% >> "%LOG%"
echo ResetBrowserProfile: %RESET_BROWSER_PROFILE% >> "%LOG%"
echo. >> "%LOG%"

echo.
echo ==========================================
echo  Talar SaaS PWA - Cache-Safe Dev Runner V2
echo ==========================================
echo Project: %PROJECT%
echo Log    : %LOG%
echo URL    : %APP_URL%
echo.

if not exist "%PROJECT%" (
  echo ERROR: Project folder not found: %PROJECT%
  echo ERROR: Project folder not found: %PROJECT% >> "%LOG%"
  goto FINISH
)

cd /d "%PROJECT%"

if not exist "package.json" (
  echo ERROR: package.json not found. Put this BAT in the project root.
  echo ERROR: package.json not found. >> "%LOG%"
  goto FINISH
)

if not exist ".env" (
  echo ERROR: .env not found. Create .env before running the app.
  echo ERROR: .env not found. >> "%LOG%"
  goto FINISH
)

echo Stopping any process already listening on port %PORT%...
echo Stopping any process already listening on port %PORT%... >> "%LOG%"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo Killing PID %%a
  echo Killing PID %%a >> "%LOG%"
  taskkill /PID %%a /F >> "%LOG%" 2>&1
)

if "%RESET_NEXT_CACHE%"=="1" (
  echo Removing Next.js local build cache because RESET_NEXT_CACHE=1...
  echo Removing Next.js local build cache because RESET_NEXT_CACHE=1... >> "%LOG%"
  if exist ".next" rmdir /s /q ".next" >> "%LOG%" 2>&1
  if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" >> "%LOG%" 2>&1
) else (
  echo Keeping .next cache for faster dev startup.
  echo Keeping .next cache for faster dev startup. >> "%LOG%"
)

echo Resetting isolated browser profile for this Talar run...
echo Resetting isolated browser profile: %BROWSER_PROFILE% >> "%LOG%"
if "%RESET_BROWSER_PROFILE%"=="1" (
  if exist "%BROWSER_PROFILE%" rmdir /s /q "%BROWSER_PROFILE%" >> "%LOG%" 2>&1
)
if not exist "%BROWSER_PROFILE%" mkdir "%BROWSER_PROFILE%" >nul 2>&1

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

echo Browser: %BROWSER% >> "%LOG%"

if not exist "node_modules" (
  echo Installing packages because node_modules is missing...
  echo Installing packages because node_modules is missing... >> "%LOG%"
  call npm install >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo ERROR: npm install failed. Check log: %LOG%
    goto FINISH
  )
) else (
  echo node_modules exists. Skipping npm install.
  echo node_modules exists. Skipping npm install. >> "%LOG%"
)

echo Generating Prisma Client...
echo Generating Prisma Client... >> "%LOG%"
call npx prisma generate >> "%LOG%" 2>&1
if errorlevel 1 (
  echo ERROR: Prisma generate failed. Check log: %LOG%
  goto FINISH
)

echo Preparing browser auto-open watcher...
echo Preparing browser auto-open watcher... >> "%LOG%"
start "Talar Browser Waiter" powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=%PORT%; $url='%APP_URL%?nocache=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds(); $profile='%BROWSER_PROFILE%'; $browser='%BROWSER%'; $deadline=(Get-Date).AddSeconds(180); $ready=$false; do { Start-Sleep -Milliseconds 900; try { $r=Invoke-WebRequest -Uri ('http://127.0.0.1:' + $port + '/login?health=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -TimeoutSec 5 -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop; if ($r.StatusCode -ge 200) { $ready=$true } } catch { try { $code=[int]$_.Exception.Response.StatusCode; if ($code -ge 200 -and $code -lt 400) { $ready=$true } } catch {} } } until ($ready -or (Get-Date) -gt $deadline); if ($ready) { if ($browser -and (Test-Path -LiteralPath $browser)) { Start-Process -FilePath $browser -ArgumentList @('--user-data-dir=' + $profile, '--new-window', '--no-first-run', '--no-default-browser-check', '--disable-application-cache', '--disk-cache-size=1', '--media-cache-size=1', $url) } else { Start-Process $url } }"

echo.
echo ==========================================
echo  Starting Next.js Dev Server
echo ==========================================
echo Clean browser URL:
echo %APP_URL%
echo.
echo This runner opens /login first. If a valid session exists, the app will redirect to dashboard itself.
echo .next cache is kept by default because deleting it makes startup very slow.
echo To force a full rebuild, edit this BAT and set RESET_NEXT_CACHE=1 once.
echo Press Ctrl + C to stop the server.
echo ==========================================
echo.

call npm run dev -- -H %HOST% -p %PORT% >> "%LOG%" 2>&1

:FINISH
(
  echo # Decision Matrix
  echo READY:
  echo - Runner reached the dev server start step.
  echo - Isolated browser profile was reset before launch.
  echo - Browser opens /login first to avoid stale dashboard/auth redirect loops.
  echo.
  echo REVIEW_REQUIRED:
  echo - If browser still shows stale content, manually clear site data for localhost:3000 once.
  echo - If dev startup is slow only on first request, wait for Next.js compilation to finish.
  echo.
  echo BLOCKED:
  echo - package.json, .env, npm install, or prisma generate failed.
  echo.
  echo FinalCheck: read runner.log for exact native command exit evidence.
) > "%REPORT_ROOT%\10_DECISION_MATRIX.md"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Compress-Archive -Path '%REPORT_ROOT%\*' -DestinationPath '%OUTPUT_ROOT%\%TASK_ID%_%RUN_STAMP%.zip' -Force } catch {}" >nul 2>&1

echo.
echo ==========================================
echo Finished or stopped.
echo ReportRoot: %REPORT_ROOT%
echo ReportZip : %OUTPUT_ROOT%\%TASK_ID%_%RUN_STAMP%.zip
echo Log       : %LOG%
echo ==========================================
echo.
pause
