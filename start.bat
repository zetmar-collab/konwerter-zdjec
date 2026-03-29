@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Konwerter Zdjec - Serwer (port 3020)

set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"

:: ── Sprawdz Node.js ───────────────────────────────────────────────────────
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [!] Node.js nie jest zainstalowany.
    echo     Uruchom install.bat lub pobierz z https://nodejs.org
    pause & exit /b 1
)

:: ── Sprawdz czy serwer juz dziala ────────────────────────────────────────
powershell -NoProfile -Command ^
  "try { (New-Object Net.WebClient).DownloadString('http://localhost:3020/') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel! equ 0 (
    echo [i] Serwer juz dziala. Otwieram przegladarke...
    start http://localhost:3020
    exit /b 0
)

:: ── Uruchom serwer w tle (ukryte okno przez VBScript) ────────────────────
echo Uruchamianie serwera na http://localhost:3020 ...

:: Zapisz tymczasowy VBS do cichego startu
set "TMP_VBS=%TEMP%\konw_start_%RANDOM%.vbs"
echo Set ws = CreateObject("WScript.Shell")                > "%TMP_VBS%"
echo ws.Run "node ""%APPDIR%\server.js""", 0, False        >> "%TMP_VBS%"
wscript "%TMP_VBS%"
del "%TMP_VBS%" 2>nul

:: ── Czekaj na start serwera (max 10 sekund) ───────────────────────────────
set READY=0
for /L %%i in (1,1,10) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        powershell -NoProfile -Command ^
          "try { (New-Object Net.WebClient).DownloadString('http://localhost:3020/') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 set READY=1
    )
)

if !READY! equ 0 (
    echo [!] Serwer nie odpowiada po 10 sekundach.
    echo     Sprawdz czy Node.js jest poprawnie zainstalowany.
    echo     Uruchom recznie: node "%APPDIR%\server.js"
    pause & exit /b 1
)

:: ── Otworz przegladarke ───────────────────────────────────────────────────
echo Otwieranie przegladarki...
start http://localhost:3020

echo.
echo  Serwer dziala na http://localhost:3020
echo  Nacisnij dowolny klawisz aby ZATRZYMAC serwer i zamknac.
echo  (lub uruchom stop.bat zeby zatrzymac bez zamykania tego okna)
echo.
pause >nul

:: ── Zatrzymaj serwer po wyjsciu ───────────────────────────────────────────
echo Zatrzymywanie serwera...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3020 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
echo Zamknieto.

endlocal
