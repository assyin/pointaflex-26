# Analyse : Attachement de Formulaire de Congé

**Date :** 2025-01-17  
**Demande :** Ajouter la possibilité d'attacher un formulaire de congé (PDF, WORD, image, etc.) lors de la demande de congé  
**Statut :** Analyse complète (sans implémentation)

---

## 📋 RÉSUMÉ EXÉCUTIF

### Objectif
Permettre aux employés, managers et RH d'attacher des documents (PDF, WORD, images) aux demandes de congé, avec un système de permissions et de traçabilité.

### Portée
- ✅ Upload de fichiers lors de la création de demande
- ✅ Upload/modification par les Managers
- ✅ Upload/modification par les RH
- ✅ Traçabilité (qui a ajouté/modifié le document)
- ✅ Affichage et téléchargement des documents

---

## 🔍 ÉTAT ACTUEL DU SYSTÈME

### 1. Structure Base de Données

**Modèle `Leave` (existant) :**
```prisma
model Leave {
  id                String      @id @default(uuid())
  document          String?     // URL du justificatif (existant mais non utilisé)
  // ... autres champs
}
```

**Observations :**
- ✅ Le champ `document` existe déjà (String?) mais stocke seulement une URL
- ❌ Pas de traçabilité de qui a ajouté le document
- ❌ Pas de date d'ajout/modification du document
- ❌ Pas de support multi-fichiers

### 2. Backend Actuel

**DTO `CreateLeaveDto` :**
```typescript
export class CreateLeaveDto {
  document?: string;  // Optionnel, URL string
  // ... autres champs
}
```

**Service `LeavesService.create()` :**
- ✅ Accepte déjà `document` dans le DTO
- ❌ Pas de validation de fichier
- ❌ Pas d'upload de fichier réel

**Observations :**
- Le système utilise déjà `Multer` pour les uploads (exemple : `uploadAvatar` dans `UsersController`)
- Pas d'endpoint dédié pour upload de documents de congé
- Pas de service de stockage de fichiers

### 3. Frontend Actuel

**Formulaire de création (`CreateLeaveForm`) :**
- ❌ Pas de champ pour upload de fichier
- ❌ Pas d'interface pour afficher les documents attachés
- ❌ Pas de possibilité de modifier le document après création

**Page de liste des congés :**
- ❌ Pas d'affichage des documents attachés
- ❌ Pas de bouton de téléchargement

### 4. Permissions Actuelles

**Permissions liées aux congés :**
- `leave.view_all` - Voir tous les congés
- `leave.view_own` - Voir ses propres congés
- `leave.view_team` - Voir les congés de l'équipe
- `leave.create` - Créer une demande
- `leave.update` - Modifier une demande
- `leave.approve` - Approuver une demande
- `leave.reject` - Rejeter une demande

**Observations :**
- ❌ Pas de permission spécifique pour gérer les documents (`leave.manage_documents`)
- Les permissions `leave.update` et `leave.approve` pourraient être utilisées

---

## 🎯 BESOINS IDENTIFIÉS

### 1. Fonctionnalités Requises

#### 1.1 Pour les Employés
- ✅ Upload d'un document lors de la création de demande
- ✅ Voir le document attaché à sa demande
- ✅ Télécharger le document
- ❌ Modifier le document après création (à discuter)

#### 1.2 Pour les Managers
- ✅ Voir les documents attachés aux demandes de leur équipe/département
- ✅ Télécharger les documents
- ✅ Ajouter un document si l'employé ne l'a pas fait
- ✅ Modifier/remplacer le document si nécessaire
- ✅ Voir l'historique (qui a ajouté/modifié)

#### 1.3 Pour les RH
- ✅ Voir tous les documents
- ✅ Télécharger les documents
- ✅ Ajouter un document si ni l'employé ni le manager ne l'ont fait
- ✅ Modifier/remplacer le document
- ✅ Voir l'historique complet

### 2. Types de Fichiers Supportés

**Recommandations :**
- ✅ PDF (`.pdf`) - Prioritaire
- ✅ Word (`.doc`, `.docx`)
- ✅ Images (`.jpg`, `.jpeg`, `.png`, `.gif`)
- ⚠️ Taille maximale : 10MB par fichier
- ⚠️ Nombre de fichiers : 1 fichier principal (possibilité d'ajouter plusieurs fichiers plus tard)

### 3. Workflow Proposé

```
1. Employé crée une demande
   └─> Optionnel : Upload document
   
2. Si document manquant et requis par le type de congé
   └─> Manager peut ajouter le document
   └─> OU RH peut ajouter le document
   
3. Validation
   └─> Manager/RH peut voir et télécharger le document
   └─> Document visible dans l'historique
```

---

## 🏗️ ARCHITECTURE PROPOSÉE

### 1. Modifications Base de Données

#### Option A : Extension du modèle existant (Recommandé pour MVP)

```prisma
model Leave {
  id                String      @id @default(uuid())
  document          String?     // URL ou chemin du fichier
  documentName      String?     // Nom original du fichier
  documentSize      Int?        // Taille en bytes
  documentMimeType  String?     // Type MIME (application/pdf, etc.)
  documentUploadedBy String?     // ID de l'utilisateur qui a uploadé
  documentUploadedAt DateTime?  // Date d'upload
  documentUpdatedBy  String?     // ID du dernier utilisateur qui a modifié
  documentUpdatedAt  DateTime?  // Date de dernière modification
  // ... autres champs existants
}
```

**Avantages :**
- ✅ Simple et rapide à implémenter
- ✅ Compatible avec l'existant
- ✅ Un seul document par demande (suffisant pour MVP)

**Inconvénients :**
- ❌ Pas de support multi-fichiers
- ❌ Pas d'historique complet des versions

#### Option B : Modèle séparé pour documents (Pour évolution future)

```prisma
model LeaveDocument {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  leaveId    String
  leave      Leave    @relation(fields: [leaveId], references: [id], onDelete: Cascade)
  
  fileName   String
  filePath   String   // Chemin ou URL
  fileSize   Int
  mimeType   String
  
  uploadedBy String   // User ID
  uploadedAt DateTime @default(now())
  
  isActive   Boolean  @default(true) // Pour gérer les versions
  
  @@index([leaveId])
  @@index([uploadedBy])
}
```

**Avantages :**
- ✅ Support multi-fichiers
- ✅ Historique complet
- ✅ Gestion de versions

**Inconvénients :**
- ⚠️ Plus complexe
- ⚠️ Nécessite migration de données

**Recommandation :** Commencer avec **Option A** pour MVP, migrer vers **Option B** si besoin.

### 2. Backend - Nouveaux Endpoints

#### 2.1 Upload de Document

```typescript
POST /api/v1/leaves/:id/document
Content-Type: multipart/form-data
Body: { file: File }

Response: {
  document: string,        // URL ou chemin
  documentName: string,
  documentSize: number,
  documentMimeType: string,
  documentUploadedBy: string,
  documentUploadedAt: string
}
```

**Permissions requises :**
- `leave.create` (pour l'employé propriétaire)
- `leave.update` (pour manager/RH)

**Validations :**
- ✅ Vérifier que le congé existe
- ✅ Vérifier les permissions
- ✅ Vérifier le type de fichier (PDF, DOC, DOCX, JPG, PNG, etc.)
- ✅ Vérifier la taille (max 10MB)
- ✅ Stocker le fichier
- ✅ Mettre à jour le modèle Leave

#### 2.2 Téléchargement de Document

```typescript
GET /api/v1/leaves/:id/document
Response: File (stream)
```

**Permissions requises :**
- `leave.view_own` (pour son propre congé)
- `leave.view_team` (pour manager)
- `leave.view_all` (pour RH)

#### 2.3 Suppression de Document

```typescript
DELETE /api/v1/leaves/:id/document
```

**Permissions requises :**
- `leave.update` (pour manager/RH)
- L'employé peut supprimer seulement si le statut est PENDING

#### 2.4 Modification du DTO

```typescript
export class CreateLeaveDto {
  // ... champs existants
  document?: File;  // Pour upload direct lors de création
}

export class UpdateLeaveDto {
  // ... champs existants
  document?: File;  // Pour modification
}
```

### 3. Service de Stockage

#### Option A : Stockage Local (Recommandé pour MVP)

**Structure :**
```
backend/uploads/
  leaves/
    {tenantId}/
      {leaveId}/
        document.pdf
```

**Avantages :**
- ✅ Simple à implémenter
- ✅ Pas de dépendance externe
- ✅ Gratuit

**Inconvénients :**
- ❌ Pas de scalabilité
- ❌ Pas de backup automatique
- ❌ Problèmes en production multi-instances

#### Option B : Stockage Cloud (S3, Azure Blob, etc.)

**Avantages :**
- ✅ Scalable
- ✅ Backup automatique
- ✅ CDN possible
- ✅ Sécurisé

**Inconvénients :**
- ⚠️ Coût
- ⚠️ Configuration plus complexe

**Recommandation :** Commencer avec **Option A**, prévoir migration vers **Option B**.

### 4. Frontend - Modifications

#### 4.1 Formulaire de Création

**Ajout dans `CreateLeaveForm` :**
```tsx
<div>
  <label>Formulaire de congé (PDF, Word, Image)</label>
  <input 
    type="file" 
    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
    onChange={handleFileChange}
  />
  {selectedFile && (
    <div>
      <span>{selectedFile.name}</span>
      <button onClick={removeFile}>Supprimer</button>
    </div>
  )}
</div>
```

**Workflow :**
1. Utilisateur sélectionne un fichier
2. Validation côté client (type, taille)
3. Upload lors de la soumission du formulaire
4. Affichage du fichier sélectionné avant soumission

#### 4.2 Affichage dans la Liste

**Ajout d'une colonne "Document" :**
```tsx
<TableCell>
  {leave.document ? (
    <div className="flex items-center gap-2">
      <FileIcon />
      <button onClick={() => downloadDocument(leave.id)}>
        Télécharger
      </button>
      {hasPermission('leave.update') && (
        <button onClick={() => uploadNewDocument(leave.id)}>
          Modifier
        </button>
      )}
    </div>
  ) : (
    <span className="text-gray-400">Aucun document</span>
  )}
</TableCell>
```

#### 4.3 Modal de Détails

**Ajout d'une section "Documents" :**
```tsx
<div className="border-t pt-4">
  <h3>Document attaché</h3>
  {leave.document ? (
    <div>
      <p>Fichier : {leave.documentName}</p>
      <p>Taille : {formatFileSize(leave.documentSize)}</p>
      <p>Ajouté par : {leave.documentUploadedBy?.firstName}</p>
      <p>Date : {formatDate(leave.documentUploadedAt)}</p>
      <Button onClick={downloadDocument}>Télécharger</Button>
      {canModify && (
        <Button onClick={openUploadModal}>Modifier</Button>
      )}
    </div>
  ) : (
    <div>
      <p>Aucun document attaché</p>
      {canAdd && (
        <Button onClick={openUploadModal}>Ajouter un document</Button>
      )}
    </div>
  )}
</div>
```

---

## 🔐 GESTION DES PERMISSIONS

### 1. Permissions Nécessaires

**Nouvelles permissions à créer :**
- `leave.upload_document` - Uploader un document
- `leave.view_document` - Voir/télécharger un document
- `leave.manage_document` - Modifier/supprimer un document

**OU utiliser les permissions existantes :**
- `leave.create` → Permet upload lors de création
- `leave.update` → Permet modification du document
- `leave.view_own/view_team/view_all` → Permet téléchargement

**Recommandation :** Utiliser les permissions existantes pour MVP, ajouter des permissions spécifiques si besoin.

### 2. Règles d'Accès

| Rôle | Créer | Voir | Modifier | Supprimer |
|------|-------|------|----------|-----------|
| **Employé** | ✅ (sa demande) | ✅ (sa demande) | ✅ (si PENDING) | ✅ (si PENDING) |
| **Manager** | ✅ (équipe) | ✅ (équipe) | ✅ (équipe) | ✅ (équipe) |
| **RH** | ✅ (tous) | ✅ (tous) | ✅ (tous) | ✅ (tous) |

**Règles supplémentaires :**
- L'employé ne peut modifier que si le statut est `PENDING`
- Le manager peut modifier même si `MANAGER_APPROVED`
- La RH peut modifier à tout moment (sauf `APPROVED` final)

---

## 📊 IMPACT ET COMPLEXITÉ

### 1. Fichiers à Modifier

#### Backend
- ✅ `backend/prisma/schema.prisma` - Ajout champs document
- ✅ `backend/src/modules/leaves/dto/create-leave.dto.ts` - Ajout File
- ✅ `backend/src/modules/leaves/dto/update-leave.dto.ts` - Ajout File
- ✅ `backend/src/modules/leaves/leaves.controller.ts` - Nouveaux endpoints
- ✅ `backend/src/modules/leaves/leaves.service.ts` - Logique upload
- ⚠️ `backend/src/modules/leaves/leaves.module.ts` - Configuration Multer
- ⚠️ Nouveau service : `FileStorageService` (optionnel)

#### Frontend
- ✅ `frontend/app/(dashboard)/leaves/page.tsx` - Formulaire + affichage
- ✅ `frontend/lib/api/leaves.ts` - Nouveaux appels API
- ✅ `frontend/lib/hooks/useLeaves.ts` - Hooks pour upload
- ⚠️ Nouveau composant : `FileUpload` (réutilisable)

### 2. Complexité Estimée

| Tâche | Complexité | Temps Estimé |
|-------|------------|--------------|
| Modifications BDD | Faible | 1h |
| Backend - Upload | Moyenne | 4h |
| Backend - Download | Faible | 1h |
| Backend - Permissions | Moyenne | 2h |
| Frontend - Formulaire | Moyenne | 3h |
| Frontend - Affichage | Faible | 2h |
| Tests | Moyenne | 3h |
| **TOTAL** | **Moyenne** | **~16h** |

### 3. Risques Identifiés

1. **Stockage de fichiers**
   - Risque : Espace disque insuffisant
   - Mitigation : Limiter taille, nettoyage automatique

2. **Sécurité**
   - Risque : Upload de fichiers malveillants
   - Mitigation : Validation stricte, scan antivirus (optionnel)

3. **Performance**
   - Risque : Upload de gros fichiers
   - Mitigation : Limite de taille, upload asynchrone

4. **Compatibilité**
   - Risque : Formats de fichiers non supportés
   - Mitigation : Liste blanche de types MIME

---

## ✅ RECOMMANDATIONS

### 1. Phase 1 : MVP (Minimum Viable Product)

**Objectif :** Fonctionnalité de base opérationnelle

**Fonctionnalités :**
- ✅ Upload lors de création (employé)
- ✅ Upload/modification par manager/RH
- ✅ Téléchargement
- ✅ Stockage local
- ✅ Un seul document par demande

**Exclusions :**
- ❌ Multi-fichiers
- ❌ Historique des versions
- ❌ Prévisualisation inline

### 2. Phase 2 : Améliorations

**Fonctionnalités additionnelles :**
- ✅ Prévisualisation PDF/images
- ✅ Compression automatique des images
- ✅ Notifications si document requis manquant
- ✅ Validation automatique (ex: vérifier que c'est bien un formulaire)

### 3. Phase 3 : Évolutions

**Fonctionnalités avancées :**
- ✅ Support multi-fichiers
- ✅ Historique des versions
- ✅ Stockage cloud (S3, etc.)
- ✅ OCR pour extraction de données (optionnel)

---

## 📝 QUESTIONS À CLARIFIER

1. **Multi-fichiers :** Un seul document ou plusieurs par demande ?
2. **Modification par employé :** L'employé peut-il modifier après création ?
3. **Document requis :** Certains types de congé nécessitent-ils obligatoirement un document ?
4. **Taille maximale :** 10MB est-il suffisant ?
5. **Stockage :** Local ou cloud dès le début ?
6. **Historique :** Besoin de garder les anciennes versions ?
7. **Notifications :** Alerter si document manquant pour un type de congé qui le requiert ?

---

## 🎯 PLAN D'ACTION PROPOSÉ

### Étape 1 : Préparation
1. ✅ Clarifier les questions ci-dessus
2. ✅ Valider l'architecture proposée
3. ✅ Définir les permissions exactes

### Étape 2 : Backend
1. Modifier le schéma Prisma
2. Créer les endpoints d'upload/download
3. Implémenter la logique de stockage
4. Ajouter les validations et permissions

### Étape 3 : Frontend
1. Ajouter le champ upload dans le formulaire
2. Créer le composant d'affichage
3. Implémenter le téléchargement
4. Ajouter les actions manager/RH

### Étape 4 : Tests
1. Tests unitaires backend
2. Tests d'intégration
3. Tests frontend
4. Tests de permissions

### Étape 5 : Documentation
1. Documentation API
2. Guide utilisateur
3. Migration guide

---

## 📌 CONCLUSION

La fonctionnalité d'attachement de formulaire de congé est **faisable** et **bien alignée** avec l'architecture existante. Le système a déjà :
- ✅ Un champ `document` dans le modèle
- ✅ Un système d'upload (exemple avec avatars)
- ✅ Un système de permissions robuste

**Recommandation :** Procéder avec l'**Option A** (extension du modèle existant) pour un MVP rapide, puis évoluer vers l'**Option B** si besoin de multi-fichiers ou d'historique.

**Complexité globale :** Moyenne  
**Temps estimé :** 2-3 jours de développement  
**Priorité :** Haute (améliore significativement l'expérience utilisateur)

---

**Document créé le :** 2025-01-17  
**Auteur :** Analyse système  
**Statut :** En attente de validation

