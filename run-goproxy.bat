@echo off
cd /d E:\testt\trollLLM
set MONGODB_URI=mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0
set MONGODB_DB_NAME=fproxy
set DEBUG=true
set MAIN_TARGET_SERVER=http://103.216.119.155:4141
set MAIN_UPSTREAM_KEY=test

echo Starting GoProxy...
echo MongoDB: %MONGODB_URI%
echo Database: %MONGODB_DB_NAME%
echo.

build\goproxy.exe
