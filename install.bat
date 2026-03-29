@echo off
setlocal EnableDelayedExpansion
title Konwerter Zdjec - Instalator

set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"

echo.
echo  === Konwerter Zdjec - Instalator ===
echo.

echo [1/4] Sprawdzanie Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo  Node.js nie znaleziono. Proba instalacji winget...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo  [BLAD] Zainstaluj Node.js recznie: https://nodejs.org
        echo  Nastepnie uruchom install.bat ponownie.
        echo.
        goto :ERROR
    )
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo      OK - Node.js !NODE_VER!

echo [2/4] Tworzenie launch.vbs...
set "VBS=%APPDIR%\launch.vbs"
del "%VBS%" 2>nul
echo Set ws  = CreateObject("WScript.Shell") > "%VBS%"
echo Set fso = CreateObject("Scripting.FileSystemObject") >> "%VBS%"
echo appDir = fso.GetParentFolderName(WScript.ScriptFullName) >> "%VBS%"
echo ws.Run "node " ^& Chr(34) ^& appDir ^& "\server.js" ^& Chr(34), 0, False >> "%VBS%"
echo WScript.Sleep 2500 >> "%VBS%"
echo ws.Run "http://localhost:3020", 1, False >> "%VBS%"
if not exist "%VBS%" (
    echo  [BLAD] Nie mozna utworzyc launch.vbs
    goto :ERROR
)
echo      OK

echo [3/4] Tworzenie skrotu na pulpicie...
powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Konwerter Zdjec.lnk');$s.TargetPath='%VBS%';$s.WorkingDirectory='%APPDIR%';$s.Save()"
echo      OK

echo [4/4] Dodawanie do Menu Start...
powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut([Environment]::GetFolderPath('StartMenu')+'\Programs\Konwerter Zdjec.lnk');$s.TargetPath='%VBS%';$s.WorkingDirectory='%APPDIR%';$s.Save()"
echo      OK

echo.
echo  Instalacja zakonczona!
echo  Skrot na pulpicie: Konwerter Zdjec
echo.
set /p "OPEN=Otworzyc teraz? [T/n]: "
if /i "!OPEN!" neq "n" wscript "%VBS%"
goto :DONE

:ERROR
echo.
pause
exit /b 1

:DONE
endlocal
