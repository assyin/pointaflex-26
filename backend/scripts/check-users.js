const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
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

    console.log('\n=== Utilisateurs dans la base de données ===\n');
    console.log(`Nombre total d'utilisateurs: ${users.length}\n`);

    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Nom: ${user.firstName} ${user.lastName}`);
      console.log(`Rôle: ${user.role}`);
      console.log(`Actif: ${user.isActive ? 'Oui' : 'Non'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
