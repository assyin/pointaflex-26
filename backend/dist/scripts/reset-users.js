"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function resetUsers() {
    try {
        console.log('🔄 Réinitialisation des utilisateurs...\n');
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.error('❌ Aucun tenant trouvé. Exécutez d\'abord: npm run init:tenant');
            process.exit(1);
        }
        console.log(`📋 Tenant trouvé: ${tenant.companyName} (${tenant.id})\n`);
        console.log('🗑️  Suppression des utilisateurs existants...');
        await prisma.user.deleteMany({
            where: { tenantId: tenant.id }
        });
        console.log('✅ Utilisateurs supprimés\n');
        console.log('👥 Création des utilisateurs...\n');
        const rhPassword = await bcrypt.hash('RH@12345', 10);
        const rhUser = await prisma.user.create({
            data: {
                tenantId: tenant.id,
                email: 'rh@demo.com',
                password: rhPassword,
                firstName: 'Admin',
                lastName: 'RH',
                role: 'ADMIN_RH',
                isActive: true,
            },
        });
        console.log(`✅ RH créé: ${rhUser.email} (${rhUser.role})`);
        const managerPassword = await bcrypt.hash('Manager@123', 10);
        const managerUser = await prisma.user.create({
            data: {
                tenantId: tenant.id,
                email: 'manager@demo.com',
                password: managerPassword,
                firstName: 'Manager',
                lastName: 'Demo',
                role: 'MANAGER',
                isActive: true,
            },
        });
        console.log(`✅ Manager créé: ${managerUser.email} (${managerUser.role})`);
        const employeePassword = await bcrypt.hash('Employee@123', 10);
        const employeeUser = await prisma.user.create({
            data: {
                tenantId: tenant.id,
                email: 'employee@demo.com',
                password: employeePassword,
                firstName: 'Employee',
                lastName: 'Demo',
                role: 'EMPLOYEE',
                isActive: true,
            },
        });
        console.log(`✅ Employé créé: ${employeeUser.email} (${employeeUser.role})`);
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('🎉 Utilisateurs réinitialisés avec succès !');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n📋 INFORMATIONS DE CONNEXION:\n');
        console.log('1️⃣  RH (ADMIN_RH):');
        console.log('   - Email: rh@demo.com');
        console.log('   - Mot de passe: RH@12345\n');
        console.log('2️⃣  Manager:');
        console.log('   - Email: manager@demo.com');
        console.log('   - Mot de passe: Manager@123\n');
        console.log('3️⃣  Employé:');
        console.log('   - Email: employee@demo.com');
        console.log('   - Mot de passe: Employee@123\n');
        console.log('═══════════════════════════════════════════════════════\n');
    }
    catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetUsers();
//# sourceMappingURL=reset-users.js.map