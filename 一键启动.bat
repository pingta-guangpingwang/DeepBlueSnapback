@echo off
chcp 65001 >nul 2>&1
set PORT=3005
echo 正在启动 DBVS...

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

echo 正在检查端口 %PORT% ...

netstat -ano | findstr :%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo 端口 %PORT% 被占用，正在释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
)

echo 启动开发环境...
npm run dev-electron
