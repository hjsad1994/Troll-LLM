@echo off
echo ========================================
echo Rebuilding and Restarting GoProxy
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Stopping current GoProxy process...
taskkill /F /IM goproxy.exe 2>nul
if %errorlevel% equ 0 (
    echo GoProxy stopped successfully
) else (
    echo GoProxy was not running
)
echo.

echo [2/3] Building new GoProxy binary...
cd goproxy
set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0
set MONGODB_DB_NAME=fproxy
set DEBUG=true
set CONFIG_PATH=config-ohmygpt-dev.json
go build -o ../build/goproxy.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

echo [3/3] Starting GoProxy...
cd ..
start "GoProxy" cmd /k "cd /d %cd%\build && set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0 && set MONGODB_DB_NAME=fproxy && set DEBUG=true && set CONFIG_PATH=config\goproxy\config-ohmygpt-dev.json && goproxy.exe"

echo.
echo ========================================
echo GoProxy restarted successfully!
echo ========================================
echo.
echo Waiting 5 seconds for service to start...
timeout /t 5 >nul

echo Checking if GoProxy is running...
tasklist | findstr /i "goproxy.exe" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] GoProxy is running!
    echo.
    echo Service should be available at: http://localhost:8005
    echo Docs: http://localhost:8005/docs
) else (
    echo [ERROR] GoProxy failed to start!
    echo Please check the error window for details.
)

echo.
pause
