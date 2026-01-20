  fermer les cmd et lancer le script en arriere plan automatique
 --------------------------------
 Option 1: PM2 (Recommandé)

  Ouvrez PowerShell ou CMD en tant qu'administrateur et exécutez:

  # 1. Installer PM2 globalement
  npm install -g pm2

  # 2. Aller dans le dossier des scripts
  cd \\wsl$\Ubuntu\home\assyin\PointaFlex\scripts\zkaccess-sync

  # 3. Démarrer les scripts avec PM2
  pm2 start sync-cit.js --name "sync-cit"
  pm2 start sync-cp.js --name "sync-cp"

  # 4. Sauvegarder la configuration
  pm2 save

  # 5. Configurer le démarrage automatique Windows
  pm2-startup install

  Commandes de gestion PM2:
  pm2 list          # Voir les processus
  pm2 logs          # Voir les logs en temps réel
  pm2 restart all   # Redémarrer tous
  pm2 stop all      # Arrêter tous


  
  Dans PowerShell:

  cd C:\PointaFlex-Sync\zkaccess-sync

  # Réinitialiser pour sync uniquement aujourd'hui
  echo '{"lastTime": "2026-01-13T00:00:00.000Z", "lastUserSn": 0}' > last_sync_cit.json
  echo '{"lastTime": "2026-01-13T00:00:00.000Z", "lastUserSn": 0}' > last_sync_cp.json

  # Redémarrer PM2
  pm2 restart all

  # Voir les logs
  pm2 logs
#####################

 Maintenant, copiez les scripts mis à jour et redémarrez PM2 :

  pm2 stop all
  copy "\\wsl$\Ubuntu\home\assyin\PointaFlex\scripts\zkaccess-sync\sync-cp.js" "C:\PointaFlex-Sync\zkaccess-sync\" /Y
  copy "\\wsl$\Ubuntu\home\assyin\PointaFlex\scripts\zkaccess-sync\sync-cit.js" "C:\PointaFlex-Sync\zkaccess-sync\" /Y
  Set-Content -Path "last_sync_cp.json" -Value '{"lastTime": null, "lastUserSn": 0}'
  Set-Content -Path "last_sync_cit.json" -Value '{"lastTime": null, "lastUserSn": 0}'
  pm2 restart all
  pm2 logs


  //////////////////////

  Configuration démarrage automatique Windows

  Exécutez ces commandes dans PowerShell (Administrateur) :

  # 1. Installer le module de démarrage automatique
  npm install -g pm2-windows-startup

  # 2. Configurer le démarrage automatique
  pm2-startup install

  # 3. Démarrer vos scripts (si pas déjà fait)
  cd C:\PointaFlex-Sync\zkaccess-sync
  pm2 start sync-cp.js --name sync-cp
  pm2 start sync-cit.js --name sync-cit
  pm2 start sync-portable.js --name sync-portable

  # 4. Sauvegarder la configuration actuelle
  pm2 save