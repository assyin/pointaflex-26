# Desinstallation de la tache planifiee PointaFlex Sync
# Executer en tant qu'Administrateur

$TaskName = "PointaFlex-Sync"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Arret de la tache..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Suppression de la tache..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

    # Supprimer le wrapper
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $WrapperScript = Join-Path $ScriptDir "sync-wrapper.cmd"
    if (Test-Path $WrapperScript) { Remove-Item $WrapperScript }

    Write-Host "Tache '$TaskName' desinstallee." -ForegroundColor Green
} else {
    Write-Host "La tache '$TaskName' n'existe pas." -ForegroundColor Yellow
}
