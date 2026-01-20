# Prompt de Diagnostic - Problème de Correspondance des Matricules

## Contexte du Problème

Je développe une application de gestion de pointage (PointaFlex) avec des terminaux biométriques ZKTeco. Le système reçoit des pointages via webhook depuis les terminaux, mais il y a un problème de correspondance entre les matricules envoyés par les terminaux et ceux stockés dans la base de données.

## Symptômes

Les terminaux biométriques envoient des pointages avec des matricules sans zéros à gauche (ex: `"3005"`, `"1091"`, `"2308"`), mais dans la base de données PostgreSQL, certains employés ont des matricules stockés avec des zéros à gauche (ex: `"03005"`, `"01091"`, `"02308"`).

**Erreurs observées dans les logs :**
```
[2025-11-25 14:56:06] ❌ [T2] Erreur 404: {"message":"Employee 3005 not found","error":"Not Found","statusCode":404}
[2025-11-25 15:33:29] ❌ [T2] Erreur 404: {"message":"Employee 1091 not found","error":"Not Found","statusCode":404}
[2025-11-25 15:33:29] ❌ [T2] Erreur 404: {"message":"Employee 2308 not found","error":"Not Found","statusCode":404}
```

## Architecture Technique

- **Backend** : NestJS avec Prisma ORM
- **Base de données** : PostgreSQL
- **Terminaux** : ZKTeco (envoient des pointages via webhook)
- **Script Python** : `zkteco_bridge.py` qui récupère les pointages du terminal et les envoie au backend

## Code Actuel

### 1. Endpoint Webhook (`backend/src/modules/attendance/attendance.service.ts`)

```typescript
async handleWebhook(
  tenantId: string,
  deviceId: string,
  webhookData: WebhookAttendanceDto,
) {
  // Vérifier que le terminal existe
  const device = await this.prisma.attendanceDevice.findFirst({
    where: { deviceId, tenantId },
  });

  if (!device) {
    throw new NotFoundException('Device not found');
  }

  // Trouver l'employé par matricule ou ID
  // D'abord, essayer de trouver par ID (UUID)
  let employee = await this.prisma.employee.findFirst({
    where: {
      tenantId,
      id: webhookData.employeeId,
    },
  });

  // Si pas trouvé par ID, chercher par matricule avec gestion des zéros à gauche
  if (!employee) {
    employee = await findEmployeeByMatriculeFlexible(
      this.prisma,
      tenantId,
      webhookData.employeeId,
    );
  }

  if (!employee) {
    throw new NotFoundException(`Employee ${webhookData.employeeId} not found`);
  }

  // ... reste du code
}
```

### 2. Fonction de Recherche Flexible (`backend/src/common/utils/matricule.util.ts`)

```typescript
export async function findEmployeeByMatriculeFlexible(
  prisma: any,
  tenantId: string,
  matriculeToFind: string | number
): Promise<any | null> {
  const matriculeStr = String(matriculeToFind).trim();
  
  // 1. Recherche exacte avec le matricule tel quel
  let employee = await prisma.employee.findFirst({
    where: {
      tenantId,
      matricule: matriculeStr,
    },
  });
  
  if (employee) return employee;
  
  // 2. Normaliser le matricule (supprimer zéros à gauche)
  const normalizedMatricule = normalizeMatricule(matriculeToFind);
  
  // 3. Recherche avec matricule normalisé
  if (normalizedMatricule !== matriculeStr) {
    employee = await prisma.employee.findFirst({
      where: {
        tenantId,
        matricule: normalizedMatricule,
      },
    });
    if (employee) return employee;
  }
  
  // 4. Générer toutes les variantes avec zéros à gauche
  const variants = generateMatriculeVariants(normalizedMatricule, 10);
  variants.push(matriculeStr);
  
  // 5. Recherche avec toutes les variantes
  employee = await prisma.employee.findFirst({
    where: {
      tenantId,
      matricule: { in: variants },
    },
  });
  
  if (employee) return employee;
  
  // 6. Requête SQL brute avec CAST pour comparaison numérique
  if (/^\d+$/.test(matriculeStr) || /^\d+$/.test(normalizedMatricule)) {
    try {
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Employee"
        WHERE "tenantId" = ${tenantId}::text
        AND (
          "matricule" = ${matriculeStr}::text
          OR "matricule" = ${normalizedMatricule}::text
          OR (
            "matricule" ~ '^[0-9]+$'
            AND CAST("matricule" AS INTEGER) = CAST(${matriculeStr} AS INTEGER)
          )
          OR (
            "matricule" ~ '^[0-9]+$'
            AND CAST("matricule" AS INTEGER) = CAST(${normalizedMatricule} AS INTEGER)
          )
        )
        LIMIT 1
      `;
      
      if (result && result.length > 0) {
        return await prisma.employee.findUnique({
          where: { id: result[0].id },
        });
      }
    } catch (sqlError: any) {
      console.warn(`[MatriculeUtil] Erreur SQL pour ${matriculeStr}:`, sqlError?.message);
    }
  }
  
  return null;
}
```

### 3. Fonction de Normalisation

```typescript
export function normalizeMatricule(matricule: string | number | null | undefined): string {
  if (!matricule) return '';
  
  const matriculeStr = String(matricule).trim();
  
  if (matriculeStr === '' || /^0+$/.test(matriculeStr)) {
    return '0';
  }
  
  // Si c'est un nombre pur, supprimer les zéros à gauche
  if (/^\d+$/.test(matriculeStr)) {
    return String(parseInt(matriculeStr, 10));
  }
  
  return matriculeStr;
}
```

### 4. Script Python qui envoie les données

```python
def send_attendance_to_backend(attendance):
    payload = {
        "employeeId": str(attendance.user_id),  # Le terminal envoie l'ID utilisateur comme entier
        "timestamp": attendance.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type": "IN",
        "method": VERIFY_MODE_MAP.get(attendance.punch, "MANUAL"),
        "rawData": {...}
    }
    # ... envoi au backend
```

## Contraintes Importantes

⚠️ **CRITIQUE** : Les matricules dans la base de données NE DOIVENT PAS être modifiés car ils sont utilisés dans un autre système externe avec leur format actuel (avec zéros à gauche). La solution doit uniquement normaliser lors de la recherche, pas lors du stockage.

## Schéma de Base de Données

```prisma
model Employee {
  id        String   @id @default(uuid())
  tenantId String
  matricule String  // Stocké comme TEXT, peut contenir des zéros à gauche
  
  @@unique([tenantId, matricule])
}
```

## Ce qui a été tenté

1. ✅ Création d'une fonction de normalisation des matricules
2. ✅ Génération de variantes avec zéros à gauche
3. ✅ Recherche avec toutes les variantes possibles
4. ✅ Requête SQL brute avec CAST pour comparaison numérique
5. ✅ Recherche exacte avant normalisation

## Problème Persistant

Malgré toutes ces approches, les erreurs 404 persistent pour les matricules `1091` et `2308`. Cela suggère que :

1. Soit les matricules dans la base sont stockés dans un format différent (ex: `"01091"`, `"001091"`, etc.)
2. Soit il y a un problème avec la requête SQL ou Prisma
3. Soit le backend n'a pas été redémarré après les modifications
4. Soit il y a un problème avec le `tenantId` qui ne correspond pas

## Questions pour le Diagnostic

1. **Les matricules existent-ils vraiment dans la base ?** 
   - Vérifier avec : `SELECT matricule FROM "Employee" WHERE matricule LIKE '%1091%' OR matricule LIKE '%2308%';`

2. **Quel est le format exact des matricules dans la base ?**
   - Sont-ils stockés comme `"1091"`, `"01091"`, `"001091"`, etc. ?

3. **Le backend a-t-il été redémarré après les modifications ?**
   - Les changements TypeScript nécessitent une recompilation

4. **Y a-t-il des logs d'erreur dans le backend ?**
   - Vérifier les logs pour voir si la fonction `findEmployeeByMatriculeFlexible` est appelée
   - Vérifier si la requête SQL génère des erreurs

5. **Le `tenantId` est-il correct dans les headers du webhook ?**
   - Vérifier que le header `X-Tenant-ID` correspond bien au tenant des employés

## Objectif

Trouver pourquoi la fonction de recherche flexible ne trouve pas les employés avec les matricules `1091` et `2308`, alors qu'ils existent probablement dans la base de données avec des zéros à gauche (ex: `"01091"`, `"02308"`).

## Solution Attendue

Une solution qui :
- ✅ Ne modifie PAS les matricules stockés dans la base
- ✅ Trouve les employés même si le format diffère (avec/sans zéros à gauche)
- ✅ Fonctionne pour tous les cas de figure (matricules numériques purs)
- ✅ Est performante (ne fait pas trop de requêtes)

Merci de m'aider à diagnostiquer et résoudre ce problème !

Essayer de fixer ce probleme qui persiste , Essayer de le resoudre avec votre logique
