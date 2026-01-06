@echo off
echo Starting GoProxy with OhMyGPT...
cd /d "%~dp0"
set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0
set MONGODB_DB_NAME=fproxy
set DEBUG=true
set CONFIG_PATH=goproxy\config-ohmygpt-dev.json
build\goproxy.exe
pause
