/**
 * Options pour l'envoi d'un email via MailService
 */
export interface SendMailOptions {
  /** Destinataire(s) principal(aux) */
  to: string | string[];
  
  /** Sujet de l'email */
  subject: string;
  
  /** Contenu HTML de l'email */
  html: string;
  
  /** Copie carbone (optionnel) */
  cc?: string[];
  
  /** Copie carbone invisible (optionnel) */
  bcc?: string[];
  
  /** Adresse de réponse (optionnel) */
  replyTo?: string;

  // Nouveaux champs pour logging
  /** Type d'email (MISSING_OUT, MISSING_IN, TEST, etc.) */
  type?: string;
  
  /** ID de l'employé concerné (optionnel) */
  employeeId?: string;
  
  /** ID du manager destinataire (optionnel) */
  managerId?: string;
  
  /** ID du template utilisé (optionnel) */
  templateId?: string;
}
