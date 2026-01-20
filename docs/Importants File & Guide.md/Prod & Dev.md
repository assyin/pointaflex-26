---
  Commandes pour basculer:

  # Basculer vers PROD
  ./backend/scripts/switch-env.sh prod

  # Basculer vers DEV
  ./backend/scripts/switch-env.sh dev

  # Voir l'environnement actuel
  ./backend/scripts/switch-env.sh status

##########################################################################################

   Configuration Complète!

  Architecture finale:

  ╔══════════════════════════════════════════════════════════════════╗
  ║                    ENVIRONNEMENTS POINTAFLEX                     ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║                                                                  ║
  ║  🔵 DEV (Développement)         🟢 PROD (Production)            ║
  ║  ├── Backend:  :3000            ├── Backend:  :4000             ║
  ║  ├── Frontend: :3001            ├── Frontend: :4001             ║
  ║  └── BDD: EU North 1            └── BDD: EU West 1              ║
  ║                                                                  ║
  ║                      ┌─────────────┐                            ║
  ║                      │  Terminal   │                            ║
  ║                      │   ZKTeco    │                            ║
  ║                      └──────┬──────┘                            ║
  ║                             │                                   ║
  ║                    ┌────────▼────────┐                          ║
  ║                    │  sync-dual-env  │                          ║
  ║                    └────────┬────────┘                          ║
  ║                             │                                   ║
  ║              ┌──────────────┴──────────────┐                    ║
  ║              ▼                              ▼                   ║
  ║         DEV :3000                      PROD :4000               ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝

  ---
  Commandes de démarrage:

  # Démarrer TOUT (DEV + PROD)
  ./start-all-environments.sh

  # Ou séparément:
  ./PointaFlex/start-dev.sh       # DEV seulement
  ./PointaFlex-PROD/start-prod.sh # PROD seulement

  # Arrêter tout
  ./stop-all-environments.sh

  ---
  Synchronisation des pointages:

  # Envoyer vers DEV ET PROD simultanément
  cd /home/assyin/PointaFlex/scripts/zkaccess-sync
  node sync-dual-env.js

  ---
  Voulez-vous que je démarre les deux environnements maintenant?


  ########################################################################################


  onfiguration PM2 Complète!

  Status actuel:

  | Service       | Port | Status    | PID   |
  |---------------|------|-----------|-------|
  | dev-backend   | 3000 | ✅ online | 13504 |
  | dev-frontend  | 3001 | ✅ online | 13355 |
  | prod-backend  | 4000 | ✅ online | 13516 |
  | prod-frontend | 4001 | ✅ online | 13361 |
  | sync-dual     | -    | ✅ online | 13273 |

  ---
  URLs d'accès:

  | Environnement | Frontend              | Backend API           | Swagger                        |
  |---------------|-----------------------|-----------------------|--------------------------------|
  | DEV           | http://localhost:3001 | http://localhost:3000 | http://localhost:3000/api/docs |
  | PROD          | http://localhost:4001 | http://localhost:4000 | http://localhost:4000/api/docs |

  ---
  Commandes PM2 utiles:

  # Status
  pm2 status

  # Logs en temps réel
  pm2 logs

  # Logs d'un service spécifique
  pm2 logs dev-backend
  pm2 logs prod-backend

  # Redémarrer
  pm2 restart all
  pm2 restart dev-backend
  pm2 restart prod-backend

  # Arrêter
  pm2 stop all

  # Monitoring
  pm2 monit

  ---
  Pour démarrage automatique au boot (optionnel):

  Exécutez cette commande:
  sudo env PATH=$PATH:/home/assyin/.nvm/versions/node/v18.20.8/bin /mnt/c/Users/yassi/AppData/Roaming/npm/node_modules/pm2/bin/pm2 startup systemd -u assyin --hp /home/assyin

  ---
  Les pointages sont maintenant synchronisés vers DEV ET PROD simultanément! 🎉



  Tous les services fonctionnent. Voici le résumé de la configuration :

  Configuration terminée

  Scripts Windows modifiés (C:\PointaFlex-Sync\zkaccess-sync)

  | Script      | Terminal             | Envoie vers                        |
  |-------------|----------------------|------------------------------------|
  | sync-cp.js  | CP (192.168.16.174)  | DEV (port 3000) + PROD (port 4000) |
  | sync-cit.js | CIT (192.168.16.175) | DEV (port 3000) + PROD (port 4000) |

  Services PM2 WSL (tous en ligne)

  | Service       | Port | Status    |
  |---------------|------|-----------|
  | dev-backend   | 3000 | ✅ online |
  | dev-frontend  | 3001 | ✅ online |
  | prod-backend  | 4000 | ✅ online |
  | prod-frontend | 4001 | ✅ online |