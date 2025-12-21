import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllSessions() {
  try {
    console.log('🔄 Désactivation de toutes les sessions utilisateur...');

    // Désactiver toutes les sessions actives
    const result = await prisma.userSession.updateMany({
      where: {
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    console.log(`✅ ${result.count} session(s) désactivée(s)`);

    // Afficher le nombre de sessions par tenant
    const sessionsByTenant = await prisma.userSession.groupBy({
      by: ['userId'],
      _count: true,
      where: {
        isActive: false,
      },
    });

    console.log(`📊 Total: ${sessionsByTenant.length} utilisateur(s) déconnecté(s)`);

  } catch (error) {
    console.error('❌ Erreur lors de la désactivation des sessions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllSessions()
  .then(() => {
    console.log('✅ Toutes les sessions ont été désactivées avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
