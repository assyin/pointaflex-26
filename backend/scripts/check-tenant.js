const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenant() {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      console.log('✅ Tenant trouvé:', tenant.companyName);
      process.exit(0);
    } else {
      console.log('❌ Aucun tenant trouvé');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenant();
