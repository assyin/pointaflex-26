# Identifiants de Connexion - PointaFlex

**Date:** 2025-12-12 16:00
**Statut:** ✅ Backend démarré et fonctionnel

---

## 🔐 Identifiants de Connexion

### 1. Admin / RH
```
Email: admin@demo.com
Mot de passe: Admin@123
Rôle: ADMIN_RH
```

### 2. Responsable RH
```
Email: rh@demo.com
Mot de passe: RH@12345
Rôle: ADMIN_RH
```

### 3. Manager
```
Email: manager@demo.com
Mot de passe: Manager@123
Rôle: MANAGER
```

### 4. Employé
```
Email: employee@demo.com
Mot de passe: Employee@123
Rôle: EMPLOYEE
```

---

## 🚀 Accès à l'Application

### Backend API
- **URL:** `http://172.17.112.163:3000/api/v1`
- **Statut:** ✅ En cours d'exécution
- **Documentation API:** `http://172.17.112.163:3000/api/docs`

### Frontend
- **URL:** Configuration automatique via `client.ts`
- **URL détectée:** `http://172.17.112.163:3000/api/v1`

---

## ✅ Tests de Connexion Effectués

Tous les comptes ont été testés et fonctionnent correctement:
- ✅ admin@demo.com - OK
- ✅ rh@demo.com - OK
- ✅ manager@demo.com - OK
- ✅ employee@demo.com - OK

---

## 📝 Notes Importantes

1. **Backend démarré automatiquement** sur le port 3000
2. **Mots de passe réinitialisés** via le script `scripts/reset-demo-passwords.ts`
3. **Adresse IP WSL correcte:** 172.17.112.163
4. Les identifiants ci-dessus remplacent les anciens mots de passe

---

## 🔧 Pour Démarrer le Backend Manuellement

Si le backend n'est pas en cours d'exécution:

```bash
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

Le backend sera disponible sur:
- `http://localhost:3000`
- `http://172.17.112.163:3000`

---

## 🔄 Pour Réinitialiser les Mots de Passe

Si vous avez besoin de réinitialiser les mots de passe:

```bash
cd /home/assyin/PointaFlex/backend
npx ts-node scripts/reset-demo-passwords.ts
```

Le script réinitialisera tous les mots de passe aux valeurs ci-dessus.
