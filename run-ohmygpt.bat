@echo off
cd /d E:\testt\trollLLM

set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0
set MONGODB_DB_NAME=fproxy
set DEBUG=true
set CONFIG_PATH=goproxy\config-ohmygpt-dev.json

echo ========================================
echo Starting GoProxy with OhMyGPT Config
echo ========================================
echo Config: goproxy\config-ohmygpt-dev.json
echo Port: 8005
echo MongoDB: fproxy
echo OhMyGPT Endpoint: https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg
echo ========================================
echo.

build\goproxy.exe
