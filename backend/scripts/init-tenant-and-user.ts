import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function initTenantAndUser() {
  try {
    console.log('🚀 Initialisation du tenant et de l\'utilisateur admin...\n');

    // 1. Créer le tenant
    console.log('📝 Création du tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        companyName: 'PointageFlex Demo',
        slug: 'demo',
        email: 'admin@pointageflex.com',
        phone: '+212 600 000 000',
        address: 'Casablanca, Maroc',
        country: 'MA',
        timezone: 'Africa/Casablanca',
      },
    });

    console.log(`✅ Tenant créé: ${tenant.companyName}`);
    console.log(`   - ID: ${tenant.id}`);
    console.log(`   - Slug: ${tenant.slug}\n`);

    // 2. Créer les paramètres du tenant
    console.log('⚙️  Création des paramètres du tenant...');
    const settings = await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        workDaysPerWeek: 6,
        maxWeeklyHours: 44,
        lateToleranceEntry: 15,
        breakDuration: 60,
        annualLeaveDays: 18,
        overtimeRate: 1.25,
        nightShiftRate: 1.50,
      },
    });

    console.log('✅ Paramètres créés\n');

    // 3. Créer un utilisateur SUPER_ADMIN
    console.log('👤 Création de l\'utilisateur admin...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@demo.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Demo',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log(`✅ Utilisateur admin créé: ${adminUser.email}`);
    console.log(`   - ID: ${adminUser.id}`);
    console.log(`   - Rôle: ${adminUser.role}\n`);

    // 4. Afficher les informations de connexion
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Initialisation terminée avec succès !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 INFORMATIONS DE CONNEXION:\n');
    console.log('   Tenant:');
    console.log(`   - Nom: ${tenant.companyName}`);
    console.log(`   - Slug: ${tenant.slug}`);
    console.log(`   - ID: ${tenant.id}`);
    console.log('\n   Utilisateur Admin:');
    console.log(`   - Email: ${adminUser.email}`);
    console.log('   - Mot de passe: Admin@123');
    console.log(`   - Rôle: ${adminUser.role}`);
    console.log('\n═══════════════════════════════════════════════════════\n');

    // 5. Créer quelques types de congés par défaut
    console.log('📝 Création des types de congés...');
    await prisma.leaveType.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: 'Congé Payé',
          code: 'CP',
          isPaid: true,
          requiresDocument: false,
          maxDaysPerYear: 18,
        },
        {
          tenantId: tenant.id,
          name: 'Congé Maladie',
          code: 'CM',
          isPaid: true,
          requiresDocument: true,
          maxDaysPerYear: null,
        },
        {
          tenantId: tenant.id,
          name: 'Congé Maternité',
          code: 'CMAT',
          isPaid: true,
          requiresDocument: true,
          maxDaysPerYear: 98,
        },
        {
          tenantId: tenant.id,
          name: 'Congé sans Solde',
          code: 'CSS',
          isPaid: false,
          requiresDocument: false,
          maxDaysPerYear: null,
        },
      ],
    });

    console.log('✅ 4 types de congés créés\n');

    console.log('✨ Vous pouvez maintenant vous connecter avec ces identifiants!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initTenantAndUser();
