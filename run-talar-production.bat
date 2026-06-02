@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "PROJECT=C:\Users\bavaf\OneDrive\Desktop\talar-saas-pwa"
set "PORT=3000"
set "HOST=0.0.0.0"
set "LOG=%USERPROFILE%\Desktop\talar-production-log.txt"

echo ========================================== > "%LOG%"
echo Talar Production Start Log >> "%LOG%"
echo ========================================== >> "%LOG%"
echo User: %USERNAME% >> "%LOG%"
echo Computer: %COMPUTERNAME% >> "%LOG%"
echo Project: %PROJECT% >> "%LOG%"
echo Port: %PORT% >> "%LOG%"
echo Host: %HOST% >> "%LOG%"
echo. >> "%LOG%"

if not exist "%PROJECT%" (
    echo ERROR: Project folder not found: %PROJECT%
    echo ERROR: Project folder not found: %PROJECT% >> "%LOG%"
    goto END
)

cd /d "%PROJECT%"

if not exist "package.json" (
    echo ERROR: package.json not found.
    echo ERROR: package.json not found. >> "%LOG%"
    goto END
)

if not exist ".env" (
    echo ERROR: .env not found.
    echo ERROR: .env not found. >> "%LOG%"
    goto END
)

echo Installing packages if node_modules is missing...
if not exist "node_modules" (
    call npm install >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo ERROR: npm install failed. Check log:
        echo %LOG%
        goto END
    )
)

echo Generating Prisma client...
call npx prisma generate >> "%LOG%" 2>&1
if errorlevel 1 (
    echo ERROR: prisma generate failed. Check log:
    echo %LOG%
    goto END
)

echo Building production app...
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 (
    echo ERROR: npm run build failed. Check log:
    echo %LOG%
    goto END
)

echo.
echo ==========================================
echo Talar Production Server Started
echo ==========================================
echo Local URL:
echo http://localhost:%PORT%
echo.
echo Network URL:
echo http://SERVER-IP:%PORT%
echo.
echo Example:
echo http://192.168.1.50:%PORT%
echo.
echo Log:
echo %LOG%
echo ==========================================
echo.

call npm run start -- -H %HOST% -p %PORT%

:END
echo.
echo Finished. Check log:
echo %LOG%