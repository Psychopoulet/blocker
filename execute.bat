@echo off
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

if '%errorlevel%' NEQ '0' (
    goto goUAC
) else (
    goto goADMIN
)

:goUAC

    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params = %*:"=""
    echo UAC.ShellExecute "cmd.exe", "/c %~s0 %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:goADMIN

    pushd "%CD%"
    CD /D "%~dp0"

rem --- FROM HERE PASTE YOUR ADMIN-ENABLED BATCH SCRIPT ---
node %~dp0\main.js && pause
rem --- END OF BATCH ----
