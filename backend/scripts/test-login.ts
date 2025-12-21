import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin(email: string) {
  try {
    console.log(`\n🔐 Test de connexion pour: ${email}\n`);

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.firstName} ${user.lastName}`);
    console.log(`   Rôle legacy: ${user.role}`);
    console.log(`   Statut: ${user.isActive ? 'Actif' : 'Inactif'}\n`);

    // Récupérer les rôles RBAC
    const userTenantRoles = await prisma.userTenantRole.findMany({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    console.log(`📋 Rôles RBAC assignés: ${userTenantRoles.length}\n`);

    let allPermissions = new Set<string>();

    userTenantRoles.forEach((utr) => {
      console.log(`   🎭 Rôle: ${utr.role.name} (${utr.role.code})`);
      console.log(`      Permissions: ${utr.role.permissions.length}`);

      // Lister quelques permissions
      const permsList = utr.role.permissions
        .slice(0, 5)
        .map((rp) => rp.permission.code)
        .join(', ');
      console.log(`      Exemples: ${permsList}${utr.role.permissions.length > 5 ? ', ...' : ''}\n`);

      // Collecter toutes les permissions
      utr.role.permissions.forEach((rp) => {
        if (rp.permission && rp.permission.isActive && rp.permission.code) {
          allPermissions.add(rp.permission.code);
        }
      });
    });

    console.log(`\n✨ Total des permissions uniques: ${allPermissions.size}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 TEST DE CONNEXION ET PERMISSIONS');
  console.log('═══════════════════════════════════════════════════════');

  await testLogin('rh@demo.com');
  await testLogin('manager@demo.com');
  await testLogin('employee@demo.com');

  await prisma.$disconnect();
}

main();
