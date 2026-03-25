@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Konwerter Zdjec - Instalator

set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"
set "APPNAME=Konwerter Zdjec"

echo.
echo  +=======================================+
echo  ^|   Konwerter Zdjec  --  Instalator     ^|
echo  +=======================================+
echo.

:: ── 1. Sprawdz Node.js ───────────────────────────────────────────────────
echo [1/4] Sprawdzanie Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo      Nie znaleziono Node.js. Proba instalacji przez winget...
    winget --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo  [!] Winget niedostepny.
        echo      Pobierz Node.js LTS recznie z: https://nodejs.org
        echo      Nastepnie uruchom install.bat ponownie.
        echo.
        pause & exit /b 1
    )
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [!] Uruchom nowy terminal i wywolaj install.bat jeszcze raz.
        pause & exit /b 1
    )
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo      OK  --  Node.js !NODE_VER!

:: ── 2. Generuj launch.vbs (linia po linii, bez bloku nawiasow) ───────────
echo [2/4] Tworzenie launch.vbs...

del "%APPDIR%\launch.vbs" 2>nul

echo Set ws  = CreateObject("WScript.Shell")                   > "%APPDIR%\launch.vbs"
echo Set fso = CreateObject("Scripting.FileSystemObject")     >> "%APPDIR%\launch.vbs"
echo appDir  = fso.GetParentFolderName(WScript.ScriptFullName)>> "%APPDIR%\launch.vbs"
echo.                                                          >> "%APPDIR%\launch.vbs"
echo ws.Run "node """ ^& appDir ^& "\server.js""", 0, False   >> "%APPDIR%\launch.vbs"
echo WScript.Sleep 2500                                        >> "%APPDIR%\launch.vbs"
echo ws.Run "http://localhost:3020", 1, False                  >> "%APPDIR%\launch.vbs"

if exist "%APPDIR%\launch.vbs" (
    echo      OK
) else (
    echo  [!] Nie udalo sie utworzyc launch.vbs
)

:: ── 3. Skrot na pulpicie ─────────────────────────────────────────────────
echo [3/4] Tworzenie skrotu na pulpicie...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s  = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Konwerter Zdjec.lnk');" ^
  "$s.TargetPath     = '%APPDIR%\launch.vbs';" ^
  "$s.WorkingDirectory = '%APPDIR%';" ^
  "$s.Description    = 'Konwerter Zdjec';" ^
  "$s.Save()"
if !errorlevel! equ 0 (echo      OK) else (echo      Uwaga: brak uprawnien do pulpitu)

:: ── 4. Skrot w Menu Start ────────────────────────────────────────────────
echo [4/4] Dodawanie do Menu Start...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$sm = [Environment]::GetFolderPath('StartMenu') + '\Programs\Konwerter Zdjec.lnk';" ^
  "$s  = $ws.CreateShortcut($sm);" ^
  "$s.TargetPath       = '%APPDIR%\launch.vbs';" ^
  "$s.WorkingDirectory = '%APPDIR%';" ^
  "$s.Save()"
if !errorlevel! equ 0 (echo      OK) else (echo      Uwaga: nie dodano do Menu Start)

echo.
echo  Instalacja zakonczona!
echo.
echo  Uruchom aplikacje przez:
echo    - Skrot "Konwerter Zdjec" na pulpicie
echo    - Plik launch.vbs (cichy start, bez okna konsoli)
echo    - Plik start.bat  (okno konsoli, widac logi)
echo.
set /p "OPEN=Otworzyc teraz? [T/n]: "
if /i "!OPEN!" neq "n" wscript "%APPDIR%\launch.vbs"

endlocal
