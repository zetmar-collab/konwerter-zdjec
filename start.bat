@echo off
setlocal
chcp 65001 >nul 2>&1
title Konwerter Zdjęć – Serwer (port 3020)

set "APPDIR=%~dp0"
set "APPDIR=%APPDIR:~0,-1%"

:: Sprawdź Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js nie jest zainstalowany.
    echo     Uruchom install.bat lub pobierz ze strony https://nodejs.org
    pause
    exit /b 1
)

:: Sprawdź czy port 3020 jest już zajęty
netstat -an | find "3020" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [i] Serwer już działa na porcie 3020.
    start http://localhost:3020
    exit /b 0
)

echo Uruchamianie serwera na http://localhost:3020 ...
start /B node "%APPDIR%\server.js"

:: Poczekaj aż serwer wystartuje (max 5 sekund)
set TRIES=0
:WAIT
timeout /t 1 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3020/ 2>nul | find "200" >nul
if %errorlevel% equ 0 goto :READY
set /a TRIES+=1
if %TRIES% lss 5 goto :WAIT

:READY
echo Otwieranie przeglądarki...
start http://localhost:3020

echo.
echo Serwer działa. Zamknij to okno aby zatrzymać serwer.
echo (lub uruchom stop.bat w osobnym oknie)
echo.
pause
:: Po zamknięciu okna zatrzymaj serwer na tym porcie
for /f "tokens=5" %%p in ('netstat -ano ^| find "3020" ^| find "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

endlocal
