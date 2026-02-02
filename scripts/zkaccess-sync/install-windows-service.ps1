# ═══════════════════════════════════════════════════════════════
# INSTALLATION - Sync PointaFlex en tant que tache planifiee
# Executer en tant qu'Administrateur dans PowerShell
# ═══════════════════════════════════════════════════════════════

$TaskName = "PointaFlex-Sync"
$Description = "Synchronisation automatique des terminaux ZKTeco (CP + CIT) vers PointaFlex"

# Detecter le chemin du script automatiquement
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SyncScript = Join-Path $ScriptDir "sync-all-terminals.js"
$LogFile = Join-Path $ScriptDir "sync_all.log"

# Verifier que le script existe
if (-not (Test-Path $SyncScript)) {
    Write-Host "ERREUR: $SyncScript introuvable!" -ForegroundColor Red
    exit 1
}

# Verifier Node.js
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
    Write-Host "ERREUR: Node.js n'est pas installe!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installation du service PointaFlex Sync" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Node.js    : $NodePath"
Write-Host "  Script     : $SyncScript"
Write-Host "  Log        : $LogFile"
Write-Host "  Tache      : $TaskName"
Write-Host ""

# Supprimer la tache existante si elle existe
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Suppression de la tache existante..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Creer l'action : node sync-all-terminals.js
$Action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$SyncScript`"" `
    -WorkingDirectory $ScriptDir

# Declencheur : au demarrage du systeme (avec delai de 30s pour laisser le reseau demarrer)
$TriggerStartup = New-ScheduledTaskTrigger -AtStartup
$TriggerStartup.Delay = "PT30S"

# Declencheur : a la connexion de l'utilisateur (backup)
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn

# Parametres de la tache
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -MultipleInstances IgnoreNew

# Variables d'environnement via wrapper
$WrapperScript = Join-Path $ScriptDir "sync-wrapper.cmd"
@"
@echo off
cd /d "$ScriptDir"
set START_DATE=2026-02-01
"$NodePath" "$SyncScript"
"@ | Out-File -FilePath $WrapperScript -Encoding ASCII

# Mettre a jour l'action pour utiliser le wrapper
$Action = New-ScheduledTaskAction `
    -Execute $WrapperScript `
    -WorkingDirectory $ScriptDir

# Creer la tache (SYSTEM pour qu'elle tourne meme sans login)
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Description $Description `
        -Action $Action `
        -Trigger $TriggerStartup, $TriggerLogon `
        -Settings $Settings `
        -RunLevel Highest `
        -Force

    Write-Host ""
    Write-Host "  Tache '$TaskName' installee avec succes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  La synchronisation demarrera automatiquement:" -ForegroundColor White
    Write-Host "    - Au demarrage de Windows (30s de delai)" -ForegroundColor White
    Write-Host "    - A la connexion de l'utilisateur" -ForegroundColor White
    Write-Host "    - Redemarrage auto en cas d'erreur (3 tentatives)" -ForegroundColor White
    Write-Host ""

    # Demarrer immediatement
    Write-Host "Demarrage immediat..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2

    $task = Get-ScheduledTask -TaskName $TaskName
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "  Statut: $($task.State)" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Commandes utiles:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Voir le statut  : Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Arreter         : Stop-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Demarrer        : Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Desinstaller    : Unregister-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Voir les logs   : Get-Content '$LogFile' -Tail 50"
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Assurez-vous d'executer PowerShell en tant qu'Administrateur!" -ForegroundColor Yellow
    Write-Host "  Clic droit sur PowerShell > Executer en tant qu'administrateur" -ForegroundColor Yellow
    exit 1
}
