@echo off
title PointaFlex - Sync Terminaux CP + CIT
echo.
echo ===============================================
echo    POINTAFLEX - SYNC CP + CIT
echo    Demarrage automatique...
echo ===============================================
echo.

cd /d "%~dp0"

:: Verifier Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    echo Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

:: Installer les dependances si necessaire
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
)

:: Demarrer la synchronisation
:: START_DATE filtre les pointages avant cette date
set START_DATE=2026-02-01
node sync-all-terminals.js

:: Si le script se termine (erreur), attendre avant de fermer
echo.
echo Le sync s'est arrete. Appuyez sur une touche pour fermer.
pause
