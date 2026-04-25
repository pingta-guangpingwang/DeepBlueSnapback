@echo off
set PORT=3005
echo Starting DBVS...

if not exist node_modules (
    echo ============================================
    echo   首次启动，正在安装依赖库...
    echo   Installing dependencies, please wait...
    echo ============================================
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo 依赖安装失败，请检查网络连接后重试。
        pause
        exit /b 1
    )
    echo.
    echo 依赖安装完成！
    echo.
)

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