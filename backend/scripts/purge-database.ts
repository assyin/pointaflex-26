/**
 * Script de purge complète de la base de données
 * ⚠️ ATTENTION : Ce script supprime TOUTES les données de la base de données
 * 
 * Usage:
 *   npx ts-node scripts/purge-database.ts
 * 
 * Options:
 *   --confirm : Skip la confirmation interactive
 *   --keep-tenant : Garde le tenant et les utilisateurs de base
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PurgeOptions {
  confirm?: boolean;
  keepTenant?: boolean;
}

async function purgeDatabase(options: PurgeOptions = {}) {
  console.log('🗑️  ============================================');
  console.log('🗑️  SCRIPT DE PURGE DE LA BASE DE DONNÉES');
  console.log('🗑️  ============================================\n');

  if (!options.confirm) {
    console.log('⚠️  ATTENTION : Ce script va supprimer TOUTES les données !');
    console.log('⚠️  Cette action est IRRÉVERSIBLE !\n');
    
    // En production, on pourrait utiliser readline pour une vraie confirmation
    // Pour l'instant, on demande juste de passer --confirm
    console.log('❌ Pour exécuter ce script, utilisez : npx ts-node scripts/purge-database.ts --confirm');
    console.log('   Ou avec --keep-tenant pour garder le tenant de base : npx ts-node scripts/purge-database.ts --confirm --keep-tenant\n');
    process.exit(1);
  }

  try {
    console.log('📊 Début de la purge...\n');

    // Compteurs
    const counts: Record<string, number> = {};

    // 1. Supprimer les ShiftReplacement (pas de cascade, doit être fait en premier)
    console.log('1️⃣  Suppression des remplacements de shift...');
    counts.shiftReplacements = (await prisma.shiftReplacement.deleteMany({})).count;
    console.log(`   ✅ ${counts.shiftReplacements} remplacements supprimés\n`);

    // 2. Supprimer les données liées aux employés (seront supprimées automatiquement par cascade, mais on les compte)
    console.log('2️⃣  Suppression des pointages...');
    counts.attendance = (await prisma.attendance.deleteMany({})).count;
    console.log(`   ✅ ${counts.attendance} pointages supprimés\n`);

    console.log('3️⃣  Suppression des plannings...');
    counts.schedules = (await prisma.schedule.deleteMany({})).count;
    console.log(`   ✅ ${counts.schedules} plannings supprimés\n`);

    console.log('4️⃣  Suppression des congés...');
    counts.leaves = (await prisma.leave.deleteMany({})).count;
    console.log(`   ✅ ${counts.leaves} congés supprimés\n`);

    console.log('5️⃣  Suppression des heures supplémentaires...');
    counts.overtime = (await prisma.overtime.deleteMany({})).count;
    console.log(`   ✅ ${counts.overtime} heures supplémentaires supprimées\n`);

    console.log('6️⃣  Suppression des heures de récupération...');
    counts.recovery = (await prisma.recovery.deleteMany({})).count;
    console.log(`   ✅ ${counts.recovery} heures de récupération supprimées\n`);

    console.log('7️⃣  Suppression des notifications...');
    counts.notifications = (await prisma.notification.deleteMany({})).count;
    console.log(`   ✅ ${counts.notifications} notifications supprimées\n`);

    // 3. Supprimer les employés
    console.log('8️⃣  Suppression des employés...');
    counts.employees = (await prisma.employee.deleteMany({})).count;
    console.log(`   ✅ ${counts.employees} employés supprimés\n`);

    // 4. Supprimer les sessions utilisateur
    console.log('9️⃣  Suppression des sessions utilisateur...');
    counts.userSessions = (await prisma.userSession.deleteMany({})).count;
    console.log(`   ✅ ${counts.userSessions} sessions supprimées\n`);

    // 5. Supprimer les préférences utilisateur
    console.log('🔟 Suppression des préférences utilisateur...');
    counts.userPreferences = (await prisma.userPreferences.deleteMany({})).count;
    console.log(`   ✅ ${counts.userPreferences} préférences supprimées\n`);

    // 6. Supprimer les rôles utilisateur-tenant
    console.log('1️⃣1️⃣ Suppression des rôles utilisateur-tenant...');
    counts.userTenantRoles = (await prisma.userTenantRole.deleteMany({})).count;
    console.log(`   ✅ ${counts.userTenantRoles} rôles utilisateur-tenant supprimés\n`);

    // 7. Supprimer les permissions de rôles
    console.log('1️⃣2️⃣ Suppression des permissions de rôles...');
    counts.rolePermissions = (await prisma.rolePermission.deleteMany({})).count;
    console.log(`   ✅ ${counts.rolePermissions} permissions de rôles supprimées\n`);

    // 8. Supprimer les rôles
    console.log('1️⃣3️⃣ Suppression des rôles...');
    counts.roles = (await prisma.role.deleteMany({})).count;
    console.log(`   ✅ ${counts.roles} rôles supprimés\n`);

    // 9. Supprimer les logs d'audit
    console.log('1️⃣4️⃣ Suppression des logs d\'audit...');
    counts.auditLogs = (await prisma.auditLog.deleteMany({})).count;
    console.log(`   ✅ ${counts.auditLogs} logs d'audit supprimés\n`);

    // 10. Supprimer les appareils de pointage
    console.log('1️⃣5️⃣ Suppression des appareils de pointage...');
    counts.devices = (await prisma.attendanceDevice.deleteMany({})).count;
    console.log(`   ✅ ${counts.devices} appareils supprimés\n`);

    // 11. Supprimer les équipes
    console.log('1️⃣6️⃣ Suppression des équipes...');
    counts.teams = (await prisma.team.deleteMany({})).count;
    console.log(`   ✅ ${counts.teams} équipes supprimées\n`);

    // 12. Supprimer les sites
    console.log('1️⃣7️⃣ Suppression des sites...');
    counts.sites = (await prisma.site.deleteMany({})).count;
    console.log(`   ✅ ${counts.sites} sites supprimés\n`);

    // 13. Supprimer les shifts
    console.log('1️⃣8️⃣ Suppression des shifts...');
    counts.shifts = (await prisma.shift.deleteMany({})).count;
    console.log(`   ✅ ${counts.shifts} shifts supprimés\n`);

    // 14. Supprimer les départements
    console.log('1️⃣9️⃣ Suppression des départements...');
    counts.departments = (await prisma.department.deleteMany({})).count;
    console.log(`   ✅ ${counts.departments} départements supprimés\n`);

    // 15. Supprimer les positions
    console.log('2️⃣0️⃣ Suppression des positions...');
    counts.positions = (await prisma.position.deleteMany({})).count;
    console.log(`   ✅ ${counts.positions} positions supprimées\n`);

    // 16. Supprimer les types de congés
    console.log('2️⃣1️⃣ Suppression des types de congés...');
    counts.leaveTypes = (await prisma.leaveType.deleteMany({})).count;
    console.log(`   ✅ ${counts.leaveTypes} types de congés supprimés\n`);

    // 17. Supprimer les jours fériés
    console.log('2️⃣2️⃣ Suppression des jours fériés...');
    counts.holidays = (await prisma.holiday.deleteMany({})).count;
    console.log(`   ✅ ${counts.holidays} jours fériés supprimés\n`);

    // 18. Supprimer les paramètres tenant
    console.log('2️⃣3️⃣ Suppression des paramètres tenant...');
    counts.tenantSettings = (await prisma.tenantSettings.deleteMany({})).count;
    console.log(`   ✅ ${counts.tenantSettings} paramètres tenant supprimés\n`);

    // 19. Supprimer les utilisateurs (sauf si keepTenant)
    if (!options.keepTenant) {
      console.log('2️⃣4️⃣ Suppression des utilisateurs...');
      counts.users = (await prisma.user.deleteMany({})).count;
      console.log(`   ✅ ${counts.users} utilisateurs supprimés\n`);

      // 20. Supprimer les tenants
      console.log('2️⃣5️⃣ Suppression des tenants...');
      counts.tenants = (await prisma.tenant.deleteMany({})).count;
      console.log(`   ✅ ${counts.tenants} tenants supprimés\n`);
    } else {
      console.log('2️⃣4️⃣ Conservation des utilisateurs et tenants (--keep-tenant)\n');
    }

    // Résumé
    console.log('📊 ============================================');
    console.log('📊 RÉSUMÉ DE LA PURGE');
    console.log('📊 ============================================\n');
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    Object.entries(counts).forEach(([key, count]) => {
      if (count > 0) {
        console.log(`   ${key}: ${count}`);
      }
    });
    
    console.log(`\n   ✅ TOTAL: ${total} enregistrements supprimés\n`);

    if (options.keepTenant) {
      console.log('ℹ️  Les tenants et utilisateurs ont été conservés.');
      console.log('ℹ️  Vous pouvez maintenant recréer les données de test.\n');
    } else {
      console.log('✅ La base de données est maintenant complètement vide.');
      console.log('ℹ️  Vous devrez recréer un tenant et des utilisateurs pour continuer.\n');
    }

    console.log('🎉 Purge terminée avec succès !\n');

  } catch (error) {
    console.error('❌ Erreur lors de la purge:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse les arguments de ligne de commande
const args = process.argv.slice(2);
const options: PurgeOptions = {
  confirm: args.includes('--confirm'),
  keepTenant: args.includes('--keep-tenant'),
};

// Exécuter le script
purgeDatabase(options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

