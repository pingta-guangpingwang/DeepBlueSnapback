@echo off
echo Building and starting DBVS production version...

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

npm run start
pause