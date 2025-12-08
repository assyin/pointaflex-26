/**
 * Utilitaires pour calculer les jours fériés du Maroc
 */

import { HolidayType } from '@prisma/client';

export interface MoroccoHoliday {
  name: string;
  date: Date;
  isRecurring: boolean;
  type: HolidayType;
}

/**
 * Jours fériés fixes du Maroc (même date chaque année)
 */
export const FIXED_HOLIDAYS = [
  { name: 'Nouvel An', month: 0, day: 1 }, // 1er janvier
  { name: 'Fête du Travail', month: 4, day: 1 }, // 1er mai
  { name: 'Fête du Trône', month: 6, day: 30 }, // 30 juillet
  { name: 'Allégeance Oued Eddahab', month: 7, day: 14 }, // 14 août
  { name: 'Révolution du Roi et du Peuple', month: 7, day: 20 }, // 20 août
  { name: 'Fête de la Jeunesse', month: 7, day: 21 }, // 21 août
  { name: 'Marche Verte', month: 10, day: 6 }, // 6 novembre
  { name: 'Fête de l\'Indépendance', month: 10, day: 18 }, // 18 novembre
];

/**
 * Dates connues des jours fériés islamiques pour 2025-2027
 * Note: Ces dates sont approximatives car elles dépendent de l'observation de la lune
 */
export const ISLAMIC_HOLIDAYS_DATES: { [year: number]: Array<{ name: string; date: string; duration: number }> } = {
  2025: [
    { name: 'Ras as-Sana (Nouvel An islamique)', date: '2025-07-01', duration: 1 },
    { name: 'Aïd al-Fitr (Fin du Ramadan)', date: '2025-03-30', duration: 3 },
    { name: 'Aïd al-Adha (Fête du Sacrifice)', date: '2025-06-06', duration: 3 },
    { name: 'Mawlid (Anniversaire du Prophète)', date: '2025-09-05', duration: 1 },
  ],
  2026: [
    { name: 'Ras as-Sana (Nouvel An islamique)', date: '2026-06-20', duration: 1 },
    { name: 'Aïd al-Fitr (Fin du Ramadan)', date: '2026-03-20', duration: 3 },
    { name: 'Aïd al-Adha (Fête du Sacrifice)', date: '2026-05-27', duration: 3 },
    { name: 'Mawlid (Anniversaire du Prophète)', date: '2026-08-25', duration: 1 },
  ],
  2027: [
    { name: 'Ras as-Sana (Nouvel An islamique)', date: '2027-06-09', duration: 1 },
    { name: 'Aïd al-Fitr (Fin du Ramadan)', date: '2027-03-09', duration: 3 },
    { name: 'Aïd al-Adha (Fête du Sacrifice)', date: '2027-05-16', duration: 3 },
    { name: 'Mawlid (Anniversaire du Prophète)', date: '2027-08-14', duration: 1 },
  ],
};

/**
 * Générer les jours fériés fixes pour une année donnée
 */
export function generateFixedHolidays(year: number): MoroccoHoliday[] {
  return FIXED_HOLIDAYS.map(holiday => ({
    name: holiday.name,
    date: new Date(year, holiday.month, holiday.day),
    isRecurring: true,
    type: HolidayType.NATIONAL,
  }));
}

/**
 * Générer les jours fériés islamiques pour une année donnée
 */
export function generateIslamicHolidays(year: number): MoroccoHoliday[] {
  const holidays: MoroccoHoliday[] = [];
  const yearHolidays = ISLAMIC_HOLIDAYS_DATES[year];

  if (!yearHolidays) {
    return holidays;
  }

  for (const holiday of yearHolidays) {
    const startDate = new Date(holiday.date);
    for (let i = 0; i < holiday.duration; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      holidays.push({
        name: i === 0 ? holiday.name : `${holiday.name} (Jour ${i + 1})`,
        date,
        isRecurring: true,
        type: HolidayType.RELIGIOUS,
      });
    }
  }

  return holidays;
}

/**
 * Générer tous les jours fériés du Maroc pour une plage d'années
 */
export function generateMoroccoHolidays(startYear: number, endYear: number): MoroccoHoliday[] {
  const holidays: MoroccoHoliday[] = [];

  for (let year = startYear; year <= endYear; year++) {
    // Jours fixes
    holidays.push(...generateFixedHolidays(year));
    
    // Jours islamiques
    holidays.push(...generateIslamicHolidays(year));
  }

  return holidays;
}

