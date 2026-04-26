@echo off
set ELECTRON_CACHE=%LOCALAPPDATA%\electron\Cache
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
echo Building and starting DBHT production version...

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

call npm run start
if %errorlevel% neq 0 (
    echo.
    echo DBHT exited with an error.
    pause
)
