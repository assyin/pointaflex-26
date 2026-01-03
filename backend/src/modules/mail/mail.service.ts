import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { SendMailOptions } from './interfaces/send-mail-options.interface';
import { loadMailConfig, MailConfig } from './mail.config';

/**
 * Service d'envoi d'emails centralisé
 * 
 * Fonctionnalités:
 * - Envoi SMTP via Gmail/Google Workspace
 * - Mode simulation (MAIL_ENABLED=false)
 * - Gestion robuste des erreurs
 * - Logs clairs
 * - Ne crash jamais les jobs appelants
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private config: MailConfig;

  constructor(
    private prisma: PrismaService,
  ) {
    this.config = loadMailConfig();
  }

  /**
   * Initialise le transport SMTP au démarrage du module
   */
  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.warn('📧 Mode SIMULATION activé - Aucun email ne sera envoyé');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure, // false pour STARTTLS (port 587)
        auth: {
          user: this.config.username,
          pass: this.config.password,
        },
        connectionTimeout: 10000, // 10 secondes
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });

      // Vérifier la connexion SMTP
      await this.transporter.verify();
      this.logger.log(
        `✅ SMTP configuré avec succès (${this.config.host}:${this.config.port})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Échec configuration SMTP: ${error.message}`,
        error.stack,
      );
      this.logger.warn('⚠️ Mode SIMULATION activé suite à l\'échec SMTP');
      this.transporter = null;
    }
  }

  /**
   * Envoie un email
   * 
   * GARANTIES:
   * - Ne throw jamais d'erreur (catch + log)
   * - Supporte mode simulation
   * - Logs clairs succès/échec
   * - Utilise EmailConfig depuis la DB si disponible, sinon .env
   * 
   * @param options Options de l'email à envoyer
   * @param tenantId ID du tenant (requis pour utiliser EmailConfig depuis la DB)
   */
  async sendMail(options: SendMailOptions, tenantId?: string): Promise<void> {
    try {
      // 1. Validation minimale
      this.validateMailOptions(options);

      // 2. Récupérer la config (DB prioritaire, sinon .env)
      let emailConfig = null;
      if (tenantId) {
        try {
          emailConfig = await this.prisma.emailConfig.findUnique({
            where: { tenantId },
          });
        } catch (error) {
          this.logger.warn(`Impossible de récupérer EmailConfig pour tenant ${tenantId}, utilisation de .env`);
        }
      }

      const useDbConfig = emailConfig && emailConfig.enabled;
      const useEnvConfig = !useDbConfig && this.config.enabled && this.transporter;

      // 3. Mode simulation
      if (!useDbConfig && !useEnvConfig) {
        this.logSimulationEmail(options);
        // Logger dans EmailLog si tenantId disponible
        if (tenantId) {
          await this.logEmailToDatabase(tenantId, options, 'queued', null);
        }
        return;
      }

      // 4. Créer transporter selon la config utilisée
      let transporter: Transporter;
      let fromAddress: string;

      if (useDbConfig) {
        transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: emailConfig.username && emailConfig.password ? {
            user: emailConfig.username,
            pass: emailConfig.password,
          } : undefined,
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 15000,
        });
        fromAddress = `"${emailConfig.fromName}" <${emailConfig.fromEmail || emailConfig.username}>`;
      } else {
        transporter = this.transporter!;
        fromAddress = `"${this.config.fromName}" <${this.config.fromEmail}>`;
      }

      // 5. Préparer l'email
      const mailOptions = {
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo,
      };

      // 6. Envoyer via SMTP
      const info = await transporter.sendMail(mailOptions);

      // 7. Logger le succès
      this.logger.log(
        `✅ Email envoyé avec succès - To: ${mailOptions.to} | Subject: ${options.subject} | MessageID: ${info.messageId}`,
      );

      // 8. Logger dans EmailLog si tenantId disponible
      if (tenantId) {
        await this.logEmailToDatabase(tenantId, options, 'sent', null);
      }
    } catch (error) {
      // 9. Gestion des erreurs (JAMAIS de throw)
      this.logEmailError(options, error);

      // 10. Logger l'échec dans EmailLog si tenantId disponible
      if (tenantId) {
        await this.logEmailToDatabase(tenantId, options, 'failed', error.message);
      }
    }
  }

  /**
   * Log un email dans la table EmailLog
   */
  private async logEmailToDatabase(
    tenantId: string,
    options: SendMailOptions,
    status: 'sent' | 'failed' | 'queued',
    error: string | null,
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          tenantId,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          cc: options.cc?.join(', ') || null,
          bcc: options.bcc?.join(', ') || null,
          subject: options.subject,
          type: options.type || 'UNKNOWN',
          templateId: options.templateId || null,
          status,
          error,
          employeeId: options.employeeId || null,
          managerId: options.managerId || null,
        },
      });
    } catch (error) {
      // Ne pas faire échouer l'envoi d'email si le logging échoue
      this.logger.warn(`Impossible de logger l'email dans EmailLog: ${error.message}`);
    }
  }

  /**
   * Valide les options minimales requises
   */
  private validateMailOptions(options: SendMailOptions): void {
    if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
      throw new Error('Destinataire (to) requis');
    }

    if (!options.subject || options.subject.trim() === '') {
      throw new Error('Sujet (subject) requis');
    }

    if (!options.html || options.html.trim() === '') {
      throw new Error('Contenu HTML requis');
    }
  }

  /**
   * Log un email en mode simulation
   */
  private logSimulationEmail(options: SendMailOptions): void {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    this.logger.log(`
╔════════════════════════════════════════════════════════════╗
║          📧 SIMULATION EMAIL - Aucun envoi réel           ║
╠════════════════════════════════════════════════════════════╣
║ To:      ${to.padEnd(50)}║
║ Subject: ${options.subject.substring(0, 50).padEnd(50)}║
║ HTML:    ${(options.html.length + ' caractères').padEnd(50)}║
╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Log une erreur d'envoi d'email
   */
  private logEmailError(options: SendMailOptions, error: any): void {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    this.logger.error(
      `❌ Échec envoi email - To: ${to} | Subject: ${options.subject}`,
    );

    // Logger des détails d'erreur selon le type
    if (error.code === 'EAUTH') {
      this.logger.error(
        '🔐 Erreur d\'authentification SMTP - Vérifiez MAIL_USERNAME et MAIL_PASSWORD',
      );
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      this.logger.error(
        '⏱️ Timeout SMTP - Vérifiez MAIL_HOST et MAIL_PORT',
      );
    } else if (error.responseCode === 550) {
      this.logger.error(
        '📭 Adresse email rejetée - Vérifiez le destinataire',
      );
    } else {
      this.logger.error(`Erreur: ${error.message}`, error.stack);
    }
  }
}
