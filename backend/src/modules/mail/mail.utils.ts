import * as fs from 'fs';
import * as path from 'path';

/**
 * Charge un template HTML et remplace les variables {{variable}}
 * 
 * @param templateName Nom du fichier template (sans extension)
 * @param data Données à injecter dans le template
 * @returns HTML avec variables remplacées
 */
export function renderEmailTemplate(
  templateName: string,
  data: Record<string, any>,
): string {
  const templatePath = path.join(
    __dirname,
    'templates',
    `${templateName}.html`,
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template email introuvable: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, 'utf-8');

  // Remplacer toutes les variables {{key}} par leur valeur
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key] || '');
  });

  return html;
}
