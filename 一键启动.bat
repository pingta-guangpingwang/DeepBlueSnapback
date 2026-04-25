@echo off
set PORT=3005
echo Starting DBVS...

if not exist node_modules (
    echo ============================================
    echo   First launch - installing dependencies...
    echo   Please wait, this may take a few minutes.
    echo ============================================
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Install failed. Please check your network and try again.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

echo Checking port %PORT%...

netstat -ano | findstr :%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo Port %PORT% is in use, freeing it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
)

echo Launching DBVS...
npm run dev-electron
