import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { SupplementaryDaysService } from '../supplementary-days.service';

@Injectable()
export class DetectSupplementaryDaysJob {
  private readonly logger = new Logger(DetectSupplementaryDaysJob.name);

  constructor(
    private prisma: PrismaService,
    private supplementaryDaysService: SupplementaryDaysService,
  ) {}

  /**
   * Job batch quotidien de CONSOLIDATION des jours supplémentaires
   *
   * MODÈLE HYBRIDE:
   * - Niveau 1 (Temps réel): Les SupplementaryDay sont créés immédiatement lors du pointage OUT
   *   dans AttendanceService.createAutoSupplementaryDay()
   * - Niveau 2 (Ce job): Filet de sécurité qui vérifie, recalcule et corrige les incohérences
   *
   * Ce job:
   * 1. Détecte les pointages de la veille sur weekend/jour férié SANS SupplementaryDay associé
   * 2. Crée les enregistrements manquants
   * 3. Log les statistiques pour audit
   *
   * Exécution par défaut à 00:30 chaque jour (après le job overtime à minuit)
   */
  @Cron('30 0 * * *') // 00:30 chaque jour
  async detectSupplementaryDays() {
    this.logger.log('🔄 Démarrage du job de CONSOLIDATION des jours supplémentaires...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Récupérer tous les tenants
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true, companyName: true },
      });

      this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);

      let totalCreated = 0;
      let totalExisting = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const tenant of tenants) {
        try {
          const stats = await this.supplementaryDaysService.detectMissingSupplementaryDays(
            tenant.id,
            yesterday,
            yesterdayEnd,
          );

          totalCreated += stats.created;
          totalExisting += stats.existing;
          totalSkipped += stats.skipped;
          totalErrors += stats.errors;

          if (stats.created > 0) {
            this.logger.warn(
              `⚠️ [CONSOLIDATION] ${stats.created} jour(s) supplémentaire(s) manquant(s) créé(s) pour ${tenant.companyName}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Erreur lors de la consolidation des jours supp. pour le tenant ${tenant.id}:`,
            error,
          );
          totalErrors++;
        }
      }

      // Log de synthèse globale
      this.logger.log(
        `📊 Consolidation terminée: ${totalCreated} créés, ${totalExisting} existants, ${totalSkipped} ignorés, ${totalErrors} erreurs`,
      );

      if (totalCreated > 0) {
        this.logger.warn(
          `⚠️ [FILET DE SÉCURITÉ] ${totalCreated} jour(s) supplémentaire(s) n'avaient pas été créé(s) en temps réel`,
        );
      }

      this.logger.log('✅ Consolidation des jours supplémentaires terminée avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la consolidation globale des jours supp.:', error);
    }
  }

  /**
   * Méthode manuelle pour traiter une période spécifique (utilisable via endpoint admin)
   */
  async processDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ created: number; existing: number; skipped: number; errors: number }> {
    this.logger.log(
      `🔄 Traitement manuel pour tenant ${tenantId}: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`,
    );

    return this.supplementaryDaysService.detectMissingSupplementaryDays(
      tenantId,
      startDate,
      endDate,
    );
  }
}
