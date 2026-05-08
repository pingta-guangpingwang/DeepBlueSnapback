@echo off
set PORT=3005
set ELECTRON_CACHE=%LOCALAPPDATA%\electron\Cache
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
echo Starting DBHT...

echo Checking dependencies...
echo.
call npm install --foreground-scripts --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo Install failed. Please check your network and try again.
    pause
    exit /b 1
)
echo.
echo Dependencies ready!
echo.

echo Checking port %PORT%...

netstat -ano | findstr :%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo Port %PORT% is in use, freeing it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
)

echo Launching DBHT...
call npm run dev-electron
if %errorlevel% neq 0 (
    echo.
    echo DBHT exited with an error.
    pause
)
