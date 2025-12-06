@echo off
cd /d "%~dp0"
node "%APPDATA%\npm\node_modules\http-server\bin\http-server" -p 8080 -c-1
