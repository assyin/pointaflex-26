@echo off
title PointaFlex Sync - Tous les terminaux
echo ═══════════════════════════════════════════════════════════════════
echo    POINTAFLEX SYNC - TOUS LES TERMINAUX
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
echo 🚀 Demarrage des synchronisations...
echo.

REM Lancer CIT dans une nouvelle fenêtre
start "Sync CIT" cmd /k "node sync-cit.js"

REM Attendre 2 secondes
timeout /t 2 /nobreak >nul

REM Lancer CP dans une nouvelle fenêtre
start "Sync CP" cmd /k "node sync-cp.js"

echo.
echo ✅ Les deux synchronisations sont lancees dans des fenetres separees.
echo.
echo Fermez cette fenetre ou appuyez sur une touche...
pause >nul
