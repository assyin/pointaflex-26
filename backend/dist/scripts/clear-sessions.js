"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function clearAllSessions() {
    try {
        console.log('🔄 Désactivation de toutes les sessions utilisateur...');
        const result = await prisma.userSession.updateMany({
            where: {
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
        console.log(`✅ ${result.count} session(s) désactivée(s)`);
        const sessionsByTenant = await prisma.userSession.groupBy({
            by: ['userId'],
            _count: true,
            where: {
                isActive: false,
            },
        });
        console.log(`📊 Total: ${sessionsByTenant.length} utilisateur(s) déconnecté(s)`);
    }
    catch (error) {
        console.error('❌ Erreur lors de la désactivation des sessions:', error);
        throw error;
    }
    finally {
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
//# sourceMappingURL=clear-sessions.js.map