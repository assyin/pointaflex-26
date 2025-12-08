"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function createDemoData() {
    try {
        console.log('🚀 Création des données de démonstration...\n');
        const tenant = await prisma.tenant.findFirst({
            where: { slug: 'demo' },
        });
        if (!tenant) {
            console.log('❌ Tenant "demo" non trouvé. Exécutez d\'abord init-tenant-and-user.ts');
            return;
        }
        console.log(`✅ Tenant trouvé: ${tenant.companyName} (${tenant.id})\n`);
        console.log('🏢 Création du site...');
        const site = await prisma.site.create({
            data: {
                tenantId: tenant.id,
                code: 'CASA-01',
                name: 'Site Principal - Casablanca',
                address: 'Boulevard Mohamed V, Casablanca',
                city: 'Casablanca',
            },
        });
        console.log(`✅ Site créé: ${site.name}\n`);
        console.log('🏭 Création des départements...');
        const departments = await prisma.$transaction([
            prisma.department.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Ressources Humaines',
                    code: 'RH',
                },
            }),
            prisma.department.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Production',
                    code: 'PROD',
                },
            }),
            prisma.department.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Logistique',
                    code: 'LOG',
                },
            }),
            prisma.department.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Qualité',
                    code: 'QUA',
                },
            }),
        ]);
        console.log(`✅ ${departments.length} départements créés\n`);
        console.log('👥 Création des équipes...');
        const teams = await prisma.$transaction([
            prisma.team.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe A',
                    code: 'A',
                    description: 'Équipe de jour principale',
                },
            }),
            prisma.team.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe B',
                    code: 'B',
                    description: 'Équipe d\'après-midi',
                },
            }),
            prisma.team.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe C',
                    code: 'C',
                    description: 'Équipe de nuit',
                },
            }),
        ]);
        console.log(`✅ ${teams.length} équipes créées\n`);
        console.log('⏰ Création des shifts...');
        const shifts = await prisma.$transaction([
            prisma.shift.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe du Matin',
                    code: 'MATIN',
                    startTime: '08:00',
                    endTime: '17:00',
                    breakDuration: 60,
                    isNightShift: false,
                    color: '#3b82f6',
                },
            }),
            prisma.shift.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe de l\'Après-midi',
                    code: 'APRES_MIDI',
                    startTime: '14:00',
                    endTime: '23:00',
                    breakDuration: 60,
                    isNightShift: false,
                    color: '#f59e0b',
                },
            }),
            prisma.shift.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Équipe de Nuit',
                    code: 'NUIT',
                    startTime: '22:00',
                    endTime: '07:00',
                    breakDuration: 60,
                    isNightShift: true,
                    color: '#8b5cf6',
                },
            }),
        ]);
        console.log(`✅ ${shifts.length} shifts créés\n`);
        console.log('👤 Création de 20 employés de démonstration...');
        const employeeNames = [
            { firstName: 'Mohammed', lastName: 'Alami' },
            { firstName: 'Fatima', lastName: 'Bennani' },
            { firstName: 'Ahmed', lastName: 'El Fassi' },
            { firstName: 'Khadija', lastName: 'Tazi' },
            { firstName: 'Youssef', lastName: 'Bensaid' },
            { firstName: 'Amina', lastName: 'Chakir' },
            { firstName: 'Hassan', lastName: 'Idrissi' },
            { firstName: 'Nadia', lastName: 'Bouzid' },
            { firstName: 'Omar', lastName: 'Taieb' },
            { firstName: 'Leila', lastName: 'Mansouri' },
            { firstName: 'Karim', lastName: 'Benjelloun' },
            { firstName: 'Samira', lastName: 'Chraibi' },
            { firstName: 'Rachid', lastName: 'Lahlou' },
            { firstName: 'Zineb', lastName: 'Kadiri' },
            { firstName: 'Mehdi', lastName: 'Sefrioui' },
            { firstName: 'Siham', lastName: 'Alaoui' },
            { firstName: 'Khalid', lastName: 'Benkirane' },
            { firstName: 'Karima', lastName: 'Filali' },
            { firstName: 'Said', lastName: 'Lazrak' },
            { firstName: 'Nora', lastName: 'Rais' },
        ];
        const employees = [];
        for (let i = 0; i < employeeNames.length; i++) {
            const name = employeeNames[i];
            const department = departments[i % departments.length];
            const team = teams[i % teams.length];
            const shift = shifts[i % shifts.length];
            const employee = await prisma.employee.create({
                data: {
                    tenantId: tenant.id,
                    matricule: `EMP${String(i + 1).padStart(4, '0')}`,
                    firstName: name.firstName,
                    lastName: name.lastName,
                    email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@demo.com`,
                    position: i % 3 === 0 ? 'Chef d\'équipe' : i % 5 === 0 ? 'Technicien' : 'Opérateur',
                    hireDate: new Date(2020 + (i % 5), (i % 12), 1),
                    contractType: i % 7 === 0 ? 'CDD' : 'CDI',
                    siteId: site.id,
                    departmentId: department.id,
                    teamId: team.id,
                    currentShiftId: shift.id,
                    isActive: true,
                },
            });
            employees.push(employee);
        }
        console.log(`✅ ${employees.length} employés créés\n`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 Données de démonstration créées avec succès !');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📊 Résumé:');
        console.log(`   - 1 Site: ${site.name}`);
        console.log(`   - ${departments.length} Départements`);
        console.log(`   - ${teams.length} Équipes`);
        console.log(`   - ${shifts.length} Shifts`);
        console.log(`   - ${employees.length} Employés\n`);
        console.log('📋 Répartition des employés:');
        const shiftCounts = {};
        for (const shift of shifts) {
            const count = employees.filter(e => e.currentShiftId === shift.id).length;
            shiftCounts[shift.name] = count;
            console.log(`   - ${shift.name}: ${count} employés`);
        }
        console.log('\n✨ Vous pouvez maintenant tester le système!\n');
    }
    catch (error) {
        console.error('❌ Erreur:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
createDemoData();
//# sourceMappingURL=create-demo-data.js.map