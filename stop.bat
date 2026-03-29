@echo off
chcp 65001 >nul 2>&1
echo Zatrzymywanie serwera na porcie 3020...

set STOPPED=0
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3020 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    echo Zatrzymano proces PID %%p
    set STOPPED=1
)

if "%STOPPED%"=="0" echo Serwer nie byl uruchomiony.
