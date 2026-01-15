@echo off
title PointaFlex Sync - Terminal CIT
echo ═══════════════════════════════════════════════════════════════════
echo    POINTAFLEX SYNC - TERMINAL CIT
echo ═══════════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installe sur Windows
    echo.
    echo Telechargez Node.js depuis: https://nodejs.org/
    pause
    exit /b 1
)

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo 📦 Installation des dependances...
    npm install node-zklib axios
)

echo.
echo 🚀 Demarrage de la synchronisation CIT...
echo.

node sync-cit.js

pause
