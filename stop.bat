@echo off
chcp 65001 >nul 2>&1
echo Zatrzymywanie serwera na porcie 3020...

for /f "tokens=5" %%p in ('netstat -ano ^| find ":3020" ^| find "LISTENING" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
    echo Zatrzymano proces PID %%p
    goto :DONE
)
echo Serwer nie był uruchomiony.

:DONE
endlocal
