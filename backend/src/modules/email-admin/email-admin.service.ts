import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import * as nodemailer from 'nodemailer';
import {
  CreateEmailConfigDto,
  UpdateEmailConfigDto,
  TestSmtpConnectionDto,
  SendTestEmailDto,
  SendTemplateTestDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
  EmailLogsQueryDto,
} from './dto';

@Injectable()
export class EmailAdminService {
  private readonly logger = new Logger(EmailAdminService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // ==================== EMAIL CONFIG ====================

  /**
   * Récupère la configuration email d'un tenant
   * Retourne une config par défaut si elle n'existe pas encore
   */
  async getEmailConfig(tenantId: string) {
    const config = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // Retourner une config par défaut si elle n'existe pas encore
      return {
        id: '',
        tenantId,
        enabled: false,
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: null,
        password: null,
        fromName: 'PointaFlex',
        fromEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Ne pas renvoyer le mot de passe en clair
    return {
      ...config,
      password: config.password ? '********' : null,
    };
  }

  /**
   * Crée ou met à jour la configuration email
   */
  async upsertEmailConfig(tenantId: string, dto: CreateEmailConfigDto | UpdateEmailConfigDto) {
    // Si le mot de passe est '********', ne pas le modifier
    const dataToSave = { ...dto };
    if (dataToSave.password === '********') {
      delete dataToSave.password;
    }

    const config = await this.prisma.emailConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dataToSave },
      update: dataToSave,
    });

    this.logger.log(`Configuration email ${config.enabled ? 'activée' : 'désactivée'} pour tenant ${tenantId}`);

    return {
      ...config,
      password: config.password ? '********' : null,
    };
  }

  /**
   * Teste la connexion SMTP
   */
  async testSmtpConnection(dto: TestSmtpConnectionDto) {
    try {
      const transporter = nodemailer.createTransport({
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        auth: dto.username && dto.password ? {
          user: dto.username,
          pass: dto.password,
        } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });

      await transporter.verify();

      this.logger.log(`✅ Test SMTP réussi: ${dto.host}:${dto.port}`);

      return {
        success: true,
        message: 'Connexion SMTP réussie',
      };
    } catch (error) {
      this.logger.error(`❌ Test SMTP échoué: ${error.message}`);

      return {
        success: false,
        message: `Échec de connexion SMTP: ${error.message}`,
        error: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Envoie un email de test
   * Permet l'envoi même si la config n'est pas activée (c'est un test)
   */
  async sendTestEmail(tenantId: string, dto: SendTestEmailDto) {
    const config = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException('Configuration email non trouvée. Veuillez d\'abord sauvegarder votre configuration.');
    }

    // Pour un email de test, on permet l'envoi même si enabled=false
    // car c'est justement pour tester la configuration

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email - PointaFlex</h1>
          </div>
          <div class="content">
            <p><strong>Bravo !</strong></p>
            <p>Votre configuration SMTP fonctionne correctement.</p>
            <p>Cet email de test a été envoyé depuis votre système PointaFlex.</p>
            <hr>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>Hôte: ${config.host}</li>
              <li>Port: ${config.port}</li>
              <li>From: ${config.fromName} &lt;${config.fromEmail}&gt;</li>
            </ul>
          </div>
          <div class="footer">
            <p>PointaFlex - Système de Gestion de Pointage</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      // Pour un email de test, créer un transporter directement
      // même si la config n'est pas activée (c'est un test)
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.username && config.password ? {
          user: config.username,
          pass: config.password,
        } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });

      const fromAddress = config.fromEmail 
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromName;

      await transporter.sendMail({
        from: fromAddress,
        to: dto.to,
        subject: dto.subject,
        html: htmlContent,
      });

      // Logger dans EmailLog
      await this.prisma.emailLog.create({
        data: {
          tenantId,
          to: dto.to,
          subject: dto.subject,
          type: 'TEST',
          status: 'sent',
        },
      });

      return {
        success: true,
        message: `Email de test envoyé à ${dto.to}`,
      };
    } catch (error) {
      this.logger.error(`Échec envoi email de test: ${error.message}`);

      // Logger l'échec
      await this.prisma.emailLog.create({
        data: {
          tenantId,
          to: dto.to,
          subject: dto.subject,
          type: 'TEST',
          status: 'failed',
          error: error.message,
        },
      });

      throw new BadRequestException(`Échec envoi email: ${error.message}`);
    }
  }

  /**
   * Envoie un email de test avec un template spécifique
   */
  async sendTemplateTest(tenantId: string, dto: SendTemplateTestDto) {
    // Récupérer le template
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundException('Template non trouvé');
    }

    // Récupérer la config email
    const config = await this.prisma.emailConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException('Configuration email non trouvée. Veuillez d\'abord sauvegarder votre configuration.');
    }

    // Créer des variables de test
    const testVariables: Record<string, string> = {
      managerName: 'Test Manager',
      employeeName: 'Test Employé',
      sessionDate: new Date().toLocaleDateString('fr-FR'),
      shiftStart: '08:00',
      shiftEnd: '17:00',
      actualIn: '08:15',
      inTime: '08:15',
      lateMinutes: '15',
    };

    // Remplacer les variables dans le template
    let html = template.htmlContent;
    Object.keys(testVariables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, testVariables[key]);
    });

    try {
      // Créer un transporter pour envoyer l'email de test
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.username && config.password ? {
          user: config.username,
          pass: config.password,
        } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });

      const fromAddress = config.fromEmail
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromName;

      await transporter.sendMail({
        from: fromAddress,
        to: dto.to,
        subject: `[TEST] ${template.subject}`,
        html,
      });

      // Logger dans EmailLog
      await this.prisma.emailLog.create({
        data: {
          tenantId,
          to: dto.to,
          subject: `[TEST] ${template.subject}`,
          type: 'TEST',
          status: 'sent',
          templateId: template.id,
        },
      });

      this.logger.log(`✅ Email de test envoyé avec template ${template.code} à ${dto.to}`);

      return {
        success: true,
        message: `Email de test envoyé à ${dto.to} avec le template ${template.name}`,
      };
    } catch (error) {
      this.logger.error(`Échec envoi email de test template: ${error.message}`);

      // Logger l'échec
      await this.prisma.emailLog.create({
        data: {
          tenantId,
          to: dto.to,
          subject: `[TEST] ${template.subject}`,
          type: 'TEST',
          status: 'failed',
          error: error.message,
          templateId: template.id,
        },
      });

      throw new BadRequestException(`Échec envoi email: ${error.message}`);
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  /**
   * Liste tous les templates d'un tenant
   */
  async getEmailTemplates(tenantId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Récupère un template par ID
   */
  async getEmailTemplate(id: string, tenantId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template email non trouvé');
    }

    return template;
  }

  /**
   * Crée un nouveau template
   */
  async createEmailTemplate(tenantId: string, dto: CreateEmailTemplateDto) {
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  /**
   * Met à jour un template
   */
  async updateEmailTemplate(id: string, tenantId: string, dto: UpdateEmailTemplateDto) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template email non trouvé');
    }

    if (template.isDefault) {
      throw new BadRequestException('Les templates par défaut ne peuvent pas être modifiés');
    }

    return this.prisma.emailTemplate.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Supprime un template
   */
  async deleteEmailTemplate(id: string, tenantId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template email non trouvé');
    }

    if (template.isDefault) {
      throw new BadRequestException('Les templates par défaut ne peuvent pas être supprimés');
    }

    await this.prisma.emailTemplate.delete({ where: { id } });

    return { message: 'Template supprimé avec succès' };
  }

  /**
   * Prévisualise un template avec des données
   */
  async previewEmailTemplate(dto: PreviewEmailTemplateDto) {
    let html = dto.htmlContent;

    Object.keys(dto.variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, dto.variables[key] || '');
    });

    return { html };
  }

  // ==================== EMAIL LOGS ====================

  /**
   * Récupère l'historique des emails avec filtres et pagination
   */
  async getEmailLogs(tenantId: string, query: EmailLogsQueryDto) {
    const where: any = { tenantId };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.managerId) where.managerId = query.managerId;

    if (query.startDate || query.endDate) {
      where.sentAt = {};
      if (query.startDate) where.sentAt.gte = new Date(query.startDate);
      if (query.endDate) where.sentAt.lte = new Date(query.endDate);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true } },
          manager: { select: { firstName: true, lastName: true } },
          template: { select: { name: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Statistiques des emails
   */
  async getEmailStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, totalCount, failedCount] = await Promise.all([
      this.prisma.emailLog.count({
        where: { tenantId, sentAt: { gte: startOfToday } },
      }),
      this.prisma.emailLog.count({
        where: { tenantId, sentAt: { gte: startOfWeek } },
      }),
      this.prisma.emailLog.count({
        where: { tenantId, sentAt: { gte: startOfMonth } },
      }),
      this.prisma.emailLog.count({ where: { tenantId } }),
      this.prisma.emailLog.count({ where: { tenantId, status: 'failed' } }),
    ]);

    // Statistiques par type (MISSING_OUT, MISSING_IN, etc.)
    const byType = await this.prisma.emailLog.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { id: true },
    });

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      total: totalCount,
      failed: failedCount,
      successRate: totalCount > 0 ? ((totalCount - failedCount) / totalCount * 100).toFixed(2) : 100,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.id,
      })),
    };
  }

  /**
   * Initialise les templates par défaut pour un tenant
   */
  async initializeDefaultTemplates(tenantId: string) {
    const defaultTemplates = [
      {
        code: 'MISSING_OUT',
        name: 'Session non clôturée',
        description: 'Notification envoyée quand un employé ne ferme pas sa session',
        subject: '[Pointage] Session non clôturée – Action requise',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'inTime', 'shiftEnd'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f97316;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>⚠️ Session Non Clôturée</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>L'employé <strong>{{employeeName}}</strong> n'a pas clôturé sa session de travail.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Heure d'entrée:</strong> {{inTime}}</li>
      <li><strong>Fin de shift prévue:</strong> {{shiftEnd}}</li>
    </ul>
    <p><strong>Action requise:</strong> Veuillez vérifier et corriger le pointage.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
      {
        code: 'MISSING_IN',
        name: 'Absence de pointage d\'entrée',
        description: 'Notification envoyée quand un employé ne pointe pas à l\'entrée',
        subject: '[Pointage] Absence de pointage d\'entrée – Action requise',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'shiftStart'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#ef4444;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>🚫 Absence de Pointage</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>L'employé <strong>{{employeeName}}</strong> n'a pas effectué de pointage d'entrée.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Début de shift prévu:</strong> {{shiftStart}}</li>
    </ul>
    <p><strong>Action requise:</strong> Veuillez vérifier la présence de l'employé.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
      {
        code: 'LATE',
        name: 'Retard',
        description: 'Notification envoyée quand un employé est en retard',
        subject: '[Pointage] Retard détecté – Information',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'shiftStart', 'actualIn', 'lateMinutes'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>⏰ Retard Détecté</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>Un retard a été enregistré pour l'employé <strong>{{employeeName}}</strong>.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Heure prévue:</strong> {{shiftStart}}</li>
      <li><strong>Heure réelle:</strong> {{actualIn}}</li>
      <li><strong>Retard:</strong> {{lateMinutes}} minutes</li>
    </ul>
    <p>Merci de prendre note de ce retard dans le cadre de la gestion des présences.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
      {
        code: 'ABSENCE_PARTIAL',
        name: 'Absence partielle',
        description: 'Notification envoyée quand un employé arrive très en retard (>=2h)',
        subject: '[Pointage] Absence partielle détectée – Action requise',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'shiftStart', 'actualIn', 'absenceHours'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#dc2626;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>⚠️ Absence Partielle</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>Une absence partielle a été détectée pour l'employé <strong>{{employeeName}}</strong>.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Heure prévue:</strong> {{shiftStart}}</li>
      <li><strong>Heure réelle:</strong> {{actualIn}}</li>
      <li><strong>Durée d'absence:</strong> {{absenceHours}} heures</li>
    </ul>
    <p><strong>Action requise:</strong> Veuillez vérifier la situation et prendre les mesures appropriées.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
      {
        code: 'ABSENCE_TECHNICAL',
        name: 'Absence technique',
        description: 'Notification envoyée quand des tentatives de pointage ont échoué',
        subject: '[Pointage] Absence technique détectée – Urgence',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'shiftStart', 'failedAttemptsCount'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#7c3aed;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>🔧 Absence Technique</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>Une absence technique a été détectée pour l'employé <strong>{{employeeName}}</strong>.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Shift prévu:</strong> {{shiftStart}}</li>
      <li><strong>Tentatives échouées:</strong> {{failedAttemptsCount}}</li>
    </ul>
    <p><strong>Cause probable:</strong> Problème matériel (lecteur de carte, biométrie) ou réseau.</p>
    <p><strong>Action urgente:</strong> Vérifier le matériel de pointage et la présence de l'employé.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
      {
        code: 'ABSENCE',
        name: 'Absence complète',
        description: 'Notification envoyée quand un employé est absent toute la journée',
        subject: '[Pointage] Absence complète détectée – Action urgente',
        category: 'notification',
        variables: ['managerName', 'employeeName', 'sessionDate', 'shiftStart'],
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#991b1b;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9fafb}.footer{padding:20px;text-align:center;font-size:12px;color:#6b7280}</style></head>
<body>
<div class="container">
  <div class="header"><h1>🚨 Absence Complète</h1></div>
  <div class="content">
    <p>Bonjour <strong>{{managerName}}</strong>,</p>
    <p>Une absence complète a été détectée pour l'employé <strong>{{employeeName}}</strong>.</p>
    <ul>
      <li><strong>Date:</strong> {{sessionDate}}</li>
      <li><strong>Shift prévu:</strong> {{shiftStart}}</li>
      <li><strong>Statut:</strong> Aucun pointage enregistré</li>
    </ul>
    <p><strong>Action urgente:</strong> Veuillez contacter l'employé et vérifier sa situation.</p>
  </div>
  <div class="footer"><p>PointaFlex - Système de Gestion de Pointage</p></div>
</div>
</body>
</html>`,
      },
    ];

    for (const template of defaultTemplates) {
      await this.prisma.emailTemplate.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: template.code,
          },
        },
        create: {
          tenantId,
          ...template,
          isDefault: true,
          active: true,
        },
        update: {
          // Ne pas écraser si existe déjà
        },
      });
    }

    this.logger.log(`Templates par défaut initialisés pour tenant ${tenantId}`);
  }
}

