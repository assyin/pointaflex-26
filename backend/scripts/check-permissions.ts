import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 VÉRIFICATION DES PERMISSIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Vérifier les utilisateurs et leurs rôles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    console.log('👥 UTILISATEURS ET LEURS RÔLES:\n');
    for (const user of users) {
      console.log(`${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Rôle: ${user.role}`);
      console.log(`   Statut: ${user.isActive ? '✅ Actif' : '❌ Inactif'}\n`);
    }

    // 2. Vérifier les rôles et le nombre de permissions
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { permissions: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    console.log('\n🎭 RÔLES ET PERMISSIONS:\n');
    for (const role of roles) {
      console.log(`${role.name} (${role.code})`);
      console.log(`   Tenant: ${role.tenantId ? 'Spécifique' : 'Système'}`);
      console.log(`   Permissions: ${role._count.permissions}`);
      console.log(`   Statut: ${role.isActive ? '✅ Actif' : '❌ Inactif'}\n`);
    }

    // 3. Statistiques globales
    const totalPermissions = await prisma.permission.count();
    console.log('\n📈 STATISTIQUES:\n');
    console.log(`   Total des permissions: ${totalPermissions}`);
    console.log(`   Total des rôles: ${roles.length}`);
    console.log(`   Total des utilisateurs: ${users.length}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Vérification terminée!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
