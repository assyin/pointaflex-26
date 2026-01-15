@echo off
title PointaFlex - Synchronisation ZKAccess
echo ===============================================
echo   SYNCHRONISATION ZKACCESS - POINTAFLEX
echo ===============================================
echo.

REM Verifier si Node.js est installe
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe ou pas dans le PATH
    echo Installez Node.js depuis: https://nodejs.org
    pause
    exit /b 1
)

REM Verifier si les modules sont installes
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    echo.
)

echo Demarrage de la synchronisation...
echo Appuyez sur Ctrl+C pour arreter.
echo.
node sync.js

pause
