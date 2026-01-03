# 📧 Module Mail - PointaFlex

Module centralisé pour l'envoi d'emails via SMTP (Gmail/Google Workspace).

---

## 📋 Fonctionnalités

- ✅ Envoi d'emails via Gmail/SMTP
- ✅ Mode simulation (MAIL_ENABLED=false)
- ✅ Templates HTML professionnels
- ✅ Gestion robuste des erreurs (ne crash jamais les jobs)
- ✅ Logs clairs et exploitables
- ✅ Configuration via variables d'environnement
- ✅ Module global (injectable partout)

---

## ⚙️ Configuration

### Variables d'environnement requises (.env)

```env
# Mode simulation (false = envoi réel, true = simulation)
MAIL_ENABLED=false

# Configuration SMTP Gmail
MAIL_PROVIDER=gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false

# Authentification (App Password Google Workspace)
MAIL_USERNAME=no-reply@domaine.com
MAIL_PASSWORD=VOTRE_APP_PASSWORD_GOOGLE

# Expéditeur
MAIL_FROM_NAME=PointaFlex
MAIL_FROM_EMAIL=no-reply@domaine.com
```

### ⚠️ Important: App Password Gmail

**Ne JAMAIS utiliser le mot de passe principal du compte Gmail!**

Pour créer un App Password:
1. Aller sur https://myaccount.google.com/security
2. Activer l'authentification à 2 facteurs
3. Générer un "App Password" dans "Mots de passe des applications"
4. Copier le mot de passe généré dans `MAIL_PASSWORD`

---

## 💻 Utilisation

### Injection du service

```typescript
import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MonService {
  constructor(private mailService: MailService) {}
}
```

### Envoi d'un email simple

```typescript
await this.mailService.sendMail({
  to: 'manager@company.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>',
});
```

### Envoi avec template

```typescript
import { renderEmailTemplate } from '../mail/mail.utils';

const html = renderEmailTemplate('missing-out-notification', {
  managerName: 'Jean Dupont',
  employeeName: 'Marie Martin',
  sessionDate: '01/01/2026',
  inTime: '08:00',
  shiftEnd: '17:00',
});

await this.mailService.sendMail({
  to: 'manager@company.com',
  subject: '[Pointage] Session non clôturée',
  html,
});
```

### Options avancées

```typescript
await this.mailService.sendMail({
  to: ['manager@company.com', 'rh@company.com'],
  subject: 'Email avec CC/BCC',
  html: '<p>Contenu</p>',
  cc: ['cc@company.com'],
  bcc: ['bcc@company.com'],
  replyTo: 'support@company.com',
});
```

---

## 🎨 Templates disponibles

### `missing-out-notification.html`
Notification envoyée quand une session de travail reste ouverte trop longtemps.

Variables: `{{managerName}}`, `{{employeeName}}`, `{{sessionDate}}`, `{{inTime}}`, `{{shiftEnd}}`

### `missing-in-notification.html`
Notification envoyée quand un employé n'a pas fait de pointage d'entrée.

Variables: `{{managerName}}`, `{{employeeName}}`, `{{sessionDate}}`, `{{shiftStart}}`

---

## 🔧 Mode Simulation

Quand `MAIL_ENABLED=false`, les emails ne sont PAS envoyés.

Au lieu de cela, un log détaillé est affiché:

```
╔════════════════════════════════════════════════════════════╗
║          📧 SIMULATION EMAIL - Aucun envoi réel           ║
╠════════════════════════════════════════════════════════════╣
║ To:      manager@company.com                               ║
║ Subject: [Pointage] Session non clôturée                   ║
║ HTML:    4380 caractères                                   ║
╚════════════════════════════════════════════════════════════╝
```

**Usage**: Parfait pour développement et tests sans spammer les managers!

---

## 🛡️ Gestion des erreurs

Le MailService **ne throw jamais d'erreur**. Tous les échecs sont:
- Catchés en interne
- Loggés avec des détails clairs
- Ne cassent jamais les jobs appelants

### Codes d'erreur courants

| Code | Signification | Solution |
|------|--------------|----------|
| `EAUTH` | Authentification échouée | Vérifier MAIL_USERNAME et MAIL_PASSWORD |
| `ETIMEDOUT` | Timeout SMTP | Vérifier MAIL_HOST et MAIL_PORT |
| `550` | Email rejeté | Vérifier adresse destinataire |

---

## 📊 Logs

### Succès

```
[MailService] ✅ Email envoyé avec succès - To: manager@company.com | Subject: [Pointage] Session non clôturée | MessageID: <abc123@gmail.com>
```

### Échec

```
[MailService] ❌ Échec envoi email - To: manager@company.com | Subject: [Pointage] Session non clôturée
[MailService] 🔐 Erreur d'authentification SMTP - Vérifiez MAIL_USERNAME et MAIL_PASSWORD
```

---

## 🧪 Tests

### Test manuel en mode simulation

1. Mettre `MAIL_ENABLED=false` dans `.env`
2. Déclencher un job MISSING_OUT ou MISSING_IN
3. Vérifier les logs console

### Test réel avec Gmail

1. Configurer App Password Gmail
2. Mettre `MAIL_ENABLED=true` dans `.env`
3. Déclencher un job
4. Vérifier réception de l'email

---

## 📁 Structure

```
src/modules/mail/
├── mail.module.ts                      # Module NestJS (@Global)
├── mail.service.ts                     # Service d'envoi d'emails
├── mail.config.ts                      # Configuration SMTP
├── mail.utils.ts                       # Utilitaires (templates)
├── interfaces/
│   └── send-mail-options.interface.ts  # Interface SendMailOptions
├── templates/
│   ├── missing-in-notification.html    # Template MISSING_IN
│   └── missing-out-notification.html   # Template MISSING_OUT
└── README.md                           # Documentation
```

---

## ⚡ Performance

- ✅ Transport SMTP initialisé une seule fois au démarrage
- ✅ Timeout configurés (10s connexion, 15s socket)
- ✅ Pas de retry agressif
- ✅ Respecte quotas Gmail (500 emails/jour pour Google Workspace)

---

## 🔒 Sécurité

- ✅ Aucun secret en dur dans le code
- ✅ App Password uniquement (jamais mot de passe principal)
- ✅ TLS via STARTTLS (port 587)
- ✅ Validation des entrées
- ✅ Pas d'injection HTML possible

---

## 📝 TODO / Améliorations futures

- [ ] Support multi-provider (SendGrid, AWS SES, etc.)
- [ ] Queue d'envoi avec retry intelligent
- [ ] Tracking des emails ouverts/cliqués
- [ ] Templates avec Handlebars avancé
- [ ] Tests unitaires et e2e
- [ ] Dashboard d'envoi d'emails

---

**Créé par**: Claude Code  
**Date**: 2026-01-01  
**Statut**: ✅ Production Ready
