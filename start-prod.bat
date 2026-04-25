@echo off
echo Building and starting DBVS production version...

echo Checking dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo Install failed. Please check your network and try again.
    pause
    exit /b 1
)
echo Dependencies ready.
echo.

call npm run start
if %errorlevel% neq 0 (
    echo.
    echo DBVS exited with an error.
    pause
)
