# Script de nettoyage et redémarrage du serveur Next.js
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Nettoyage et redémarrage Next.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Arrêter tous les processus Node.js liés à Next.js
Write-Host "Arrêt des processus Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Supprimer le cache Next.js
Write-Host "Suppression du cache .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Cache .next supprimé" -ForegroundColor Green
} else {
    Write-Host "✓ Pas de cache à supprimer" -ForegroundColor Green
}

# Supprimer le cache node_modules/.cache si existe
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✓ Cache node_modules supprimé" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage du serveur Next.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Le serveur va démarrer sur http://localhost:3001" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Gray
Write-Host ""

# Démarrer le serveur
npm run dev

