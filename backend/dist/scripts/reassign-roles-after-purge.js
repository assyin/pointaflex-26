"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function reassignRolesAfterPurge() {
    console.log('🔄 Réassignation des rôles RBAC aux utilisateurs existants...\n');
    const result = {
        total: 0,
        assigned: 0,
        alreadyAssigned: 0,
        roleNotFound: 0,
        noTenant: 0,
        noRole: 0,
        errors: 0,
    };
    try {
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                tenantId: true,
            },
            orderBy: {
                email: 'asc',
            },
        });
        result.total = users.length;
        console.log(`📊 ${users.length} utilisateur(s) actif(s) trouvé(s)\n`);
        if (users.length === 0) {
            console.log('⚠️  Aucun utilisateur trouvé. Avez-vous utilisé --keep-tenant lors de la purge ?\n');
            return result;
        }
        for (const user of users) {
            try {
                const existingRole = await prisma.userTenantRole.findFirst({
                    where: {
                        userId: user.id,
                        isActive: true,
                    },
                    include: {
                        role: true,
                    },
                });
                if (existingRole) {
                    console.log(`  ⊘ ${user.email} - Rôle RBAC déjà assigné (${existingRole.role.code})`);
                    result.alreadyAssigned++;
                    continue;
                }
                if (user.role === client_1.LegacyRole.SUPER_ADMIN) {
                    const superAdminRole = await prisma.role.findFirst({
                        where: {
                            tenantId: null,
                            code: 'SUPER_ADMIN',
                            isActive: true,
                        },
                    });
                    if (!superAdminRole) {
                        console.log(`  ❌ ${user.email} - Rôle SUPER_ADMIN non trouvé. Exécutez d'abord: npm run init:rbac`);
                        result.roleNotFound++;
                        continue;
                    }
                    if (user.tenantId) {
                        await prisma.userTenantRole.create({
                            data: {
                                userId: user.id,
                                tenantId: user.tenantId,
                                roleId: superAdminRole.id,
                                isActive: true,
                                assignedAt: new Date(),
                            },
                        });
                        console.log(`  ✓ ${user.email} - Rôle SUPER_ADMIN assigné`);
                        result.assigned++;
                    }
                    else {
                        console.log(`  ⚠️  ${user.email} - SUPER_ADMIN sans tenantId, impossible d'assigner (UserTenantRole nécessite tenantId)`);
                        result.noTenant++;
                    }
                    continue;
                }
                if (!user.tenantId) {
                    console.log(`  ⚠️  ${user.email} - Pas de tenantId, impossible d'assigner un rôle`);
                    result.noTenant++;
                    continue;
                }
                if (!user.role) {
                    console.log(`  ⚠️  ${user.email} - Pas de rôle legacy, assignation du rôle EMPLOYEE par défaut`);
                    const defaultRole = await prisma.role.findFirst({
                        where: {
                            tenantId: user.tenantId,
                            code: 'EMPLOYEE',
                            isActive: true,
                        },
                    });
                    if (defaultRole) {
                        await prisma.userTenantRole.create({
                            data: {
                                userId: user.id,
                                tenantId: user.tenantId,
                                roleId: defaultRole.id,
                                isActive: true,
                                assignedAt: new Date(),
                            },
                        });
                        console.log(`  ✓ ${user.email} - Rôle EMPLOYEE assigné par défaut`);
                        result.assigned++;
                    }
                    else {
                        console.log(`  ❌ ${user.email} - Rôle EMPLOYEE non trouvé pour le tenant. Exécutez d'abord: npm run init:rbac`);
                        result.roleNotFound++;
                    }
                    continue;
                }
                const role = await prisma.role.findFirst({
                    where: {
                        tenantId: user.tenantId,
                        code: user.role,
                        isActive: true,
                    },
                });
                if (!role) {
                    console.log(`  ❌ ${user.email} - Rôle "${user.role}" non trouvé pour le tenant. Exécutez d'abord: npm run init:rbac`);
                    result.roleNotFound++;
                    continue;
                }
                await prisma.userTenantRole.create({
                    data: {
                        userId: user.id,
                        tenantId: user.tenantId,
                        roleId: role.id,
                        isActive: true,
                        assignedAt: new Date(),
                    },
                });
                console.log(`  ✓ ${user.email} - Rôle ${user.role} assigné`);
                result.assigned++;
            }
            catch (error) {
                console.error(`  ❌ ${user.email} - Erreur: ${error.message}`);
                result.errors++;
            }
        }
        console.log('\n📊 ============================================');
        console.log('📊 RÉSUMÉ DE LA RÉASSIGNATION');
        console.log('📊 ============================================\n');
        console.log(`   Total d'utilisateurs: ${result.total}`);
        console.log(`   ✅ Rôles assignés: ${result.assigned}`);
        console.log(`   ⊘ Déjà assignés: ${result.alreadyAssigned}`);
        console.log(`   ❌ Rôle non trouvé: ${result.roleNotFound}`);
        console.log(`   ⚠️  Pas de tenantId: ${result.noTenant}`);
        console.log(`   ⚠️  Pas de rôle legacy: ${result.noRole}`);
        console.log(`   ❌ Erreurs: ${result.errors}\n`);
        if (result.roleNotFound > 0) {
            console.log('⚠️  Certains rôles n\'ont pas été trouvés.');
            console.log('   Exécutez d\'abord: npm run init:rbac\n');
        }
        if (result.assigned > 0) {
            console.log('✅ Réassignation terminée avec succès !');
            console.log('   Les utilisateurs peuvent maintenant se reconnecter.\n');
        }
        return result;
    }
    catch (error) {
        console.error('❌ Erreur fatale lors de la réassignation:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
reassignRolesAfterPurge()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
//# sourceMappingURL=reassign-roles-after-purge.js.map