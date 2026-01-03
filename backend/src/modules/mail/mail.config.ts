/**
 * Configuration SMTP pour le module Mail
 * Charge les paramètres depuis les variables d'environnement
 */
export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

/**
 * Charge la configuration SMTP depuis process.env
 */
export function loadMailConfig(): MailConfig {
  return {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
    fromName: process.env.MAIL_FROM_NAME || 'PointaFlex',
    fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@pointaflex.com',
    enabled: process.env.MAIL_ENABLED !== 'false', // Activé par défaut
  };
}
