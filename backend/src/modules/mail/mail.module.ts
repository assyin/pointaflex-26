import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { PrismaModule } from '../../database/prisma.module';

/**
 * Module Mail centralisé
 * 
 * @Global pour être disponible dans tous les modules sans import explicite
 * 
 * Exporte:
 * - MailService (injectable dans n'importe quel module)
 * 
 * Configuration:
 * - Variables d'environnement (MAIL_*) - Fallback
 * - EmailConfig depuis la DB (prioritaire si disponible)
 * - Mode simulation si MAIL_ENABLED=false ou EmailConfig.enabled=false
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
