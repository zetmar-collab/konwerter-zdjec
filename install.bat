@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Konwerter Zdjęć – Instalator

set "APPDIR=%~dp0"
set "APPDIR=%APPDIR:~0,-1%"
set "APPNAME=Konwerter Zdjęć"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     Konwerter Zdjęć – Instalator     ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 1. Sprawdź Node.js ────────────────────────────────────────────────────
echo [1/4] Sprawdzanie Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo      Node.js nie znaleziony. Próba instalacji przez winget...
    winget --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo  [!] winget niedostępny.
        echo      Pobierz Node.js ręcznie ze strony: https://nodejs.org
        echo      Zainstaluj wersję LTS, a następnie uruchom install.bat ponownie.
        echo.
        pause
        exit /b 1
    )
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if !errorlevel! neq 0 (
        echo  [!] Instalacja Node.js nie powiodła się.
        echo      Pobierz ręcznie ze strony: https://nodejs.org
        pause
        exit /b 1
    )
    :: Odśwież PATH
    call refreshenv >nul 2>&1
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [!] Uruchom ponownie terminal i wywołaj install.bat jeszcze raz.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo      OK – Node.js %NODE_VER%

:: ── 2. Utwórz cichy launcher VBScript ────────────────────────────────────
echo [2/4] Tworzenie launch.vbs...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo Set fso = CreateObject("Scripting.FileSystemObject"^)
echo appDir = fso.GetParentFolderName(WScript.ScriptFullName^)
echo.
echo ' Sprawdź czy serwer już działa
echo Set http = CreateObject("MSXML2.XMLHTTP"^)
echo On Error Resume Next
echo http.Open "GET", "http://localhost:3020/", False
echo http.Send
echo alreadyRunning = (Err.Number = 0 And http.Status = 200^)
echo On Error GoTo 0
echo.
echo If Not alreadyRunning Then
echo     WshShell.Run "cmd /c node """ ^& appDir ^& "\server.js""", 0, False
echo     WScript.Sleep 1200
echo End If
echo.
echo WshShell.Run "http://localhost:3020", 1, False
) > "%APPDIR%\launch.vbs"
echo      OK

:: ── 3. Skrót na pulpicie ──────────────────────────────────────────────────
echo [3/4] Tworzenie skrótu na pulpicie...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\%APPNAME%.lnk');" ^
  "$s.TargetPath = '%APPDIR%\launch.vbs';" ^
  "$s.WorkingDirectory = '%APPDIR%';" ^
  "$s.Description = 'Konwerter zdjec miedzy formatami';" ^
  "$s.Save()"
if %errorlevel% equ 0 (
    echo      OK – skrót utworzony na pulpicie
) else (
    echo      Uwaga: nie udało się utworzyć skrótu (brak uprawnień^?)
)

:: ── 4. Skrót w Menu Start ─────────────────────────────────────────────────
echo [4/4] Tworzenie wpisu w Menu Start...
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%STARTMENU%\%APPNAME%.lnk');" ^
  "$s.TargetPath = '%APPDIR%\launch.vbs';" ^
  "$s.WorkingDirectory = '%APPDIR%';" ^
  "$s.Save()"
if %errorlevel% equ 0 (
    echo      OK – wpis dodany w Menu Start
) else (
    echo      Uwaga: nie udało się dodać wpisu w Menu Start
)

echo.
echo  ✓ Instalacja zakończona!
echo.
echo  Możesz teraz uruchomić aplikację:
echo    • Skrót "%APPNAME%" na pulpicie
echo    • Podwójne kliknięcie launch.vbs
echo    • Lub uruchom start.bat
echo.
set /p "OPEN=Otworzyć aplikację teraz? [T/n]: "
if /i "!OPEN!" neq "n" (
    wscript "%APPDIR%\launch.vbs"
)

endlocal
