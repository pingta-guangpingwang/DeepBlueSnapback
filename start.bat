@echo off
set PORT=3005
echo Starting DBVS...
echo Checking for processes using port %PORT%...

netstat -ano | findstr :%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo Port %PORT% is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
        echo Terminating process PID: %%a
        taskkill /PID %%a /F >nul 2>&1
        if %errorlevel% equ 0 (
            echo Successfully terminated process %%a
        ) else (
            echo Failed to terminate process %%a
        )
    )
    timeout /t 3 /nobreak >nul
) else (
    echo Port %PORT% is free.
)

echo Starting development environment...
npm run dev-electron