"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function assignUserRoles() {
    try {
        console.log('🔄 Attribution des rôles RBAC aux utilisateurs...\n');
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.error('❌ Aucun tenant trouvé');
            process.exit(1);
        }
        console.log(`📋 Tenant: ${tenant.companyName}\n`);
        const users = await prisma.user.findMany({
            where: { tenantId: tenant.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        console.log(`👥 ${users.length} utilisateurs trouvés\n`);
        for (const user of users) {
            console.log(`📝 Traitement de ${user.email} (${user.role})...`);
            const role = await prisma.role.findFirst({
                where: {
                    tenantId: tenant.id,
                    code: user.role,
                },
            });
            if (!role) {
                console.log(`   ⚠️  Rôle RBAC '${user.role}' non trouvé, ignoré`);
                continue;
            }
            const existingUserRole = await prisma.userTenantRole.findFirst({
                where: {
                    userId: user.id,
                    tenantId: tenant.id,
                    roleId: role.id,
                },
            });
            if (existingUserRole) {
                console.log(`   ⊘ Déjà assigné au rôle ${role.name}`);
                continue;
            }
            await prisma.userTenantRole.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    roleId: role.id,
                    isActive: true,
                },
            });
            const permissionsCount = await prisma.rolePermission.count({
                where: { roleId: role.id },
            });
            console.log(`   ✅ Assigné au rôle ${role.name} (${permissionsCount} permissions)\n`);
        }
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('🎉 Attribution des rôles terminée avec succès!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📊 RÉSUMÉ:\n');
        for (const user of users) {
            const userRoles = await prisma.userTenantRole.findMany({
                where: {
                    userId: user.id,
                    tenantId: tenant.id,
                },
                include: {
                    role: {
                        include: {
                            _count: {
                                select: { permissions: true },
                            },
                        },
                    },
                },
            });
            console.log(`${user.firstName} ${user.lastName} (${user.email}):`);
            userRoles.forEach((ur) => {
                console.log(`   - ${ur.role.name}: ${ur.role._count.permissions} permissions`);
            });
            console.log('');
        }
    }
    catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
assignUserRoles();
//# sourceMappingURL=assign-user-roles.js.map