@echo off
echo Starting GoProxy with OhMyGPT...
cd /d "%~dp0"
set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0
set MONGODB_DB_NAME=fproxy
set DEBUG=true
set CONFIG_PATH=goproxy\config-ohmygpt-dev.json

rem GLM Provider Configuration
set GLM_API_KEY=c766e3323f504b5da5eaa9b2b971962d.g9e5mUzILgPPvTc7
rem Z.ai Claude Code endpoint (Anthropic format)
set GLM_ENDPOINT=https://api.z.ai/api/anthropic/v1/messages

rem Cache Fallback Detection
set CACHE_FALLBACK_DETECTION=true
set CACHE_FALLBACK_THRESHOLD_COUNT=5
set CACHE_FALLBACK_TIME_WINDOW_MIN=1
set CACHE_FALLBACK_ALERT_INTERVAL_MIN=5

rem Failover Manager
set CACHE_FAILOVER_ENABLED=true
set CACHE_FAILOVER_LOSS_THRESHOLD=0.1
set CACHE_FAILOVER_COOLDOWN_MINUTES=15

build\goproxy.exe
pause
