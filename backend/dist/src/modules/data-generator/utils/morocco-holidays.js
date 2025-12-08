"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISLAMIC_HOLIDAYS_DATES = exports.FIXED_HOLIDAYS = void 0;
exports.generateFixedHolidays = generateFixedHolidays;
exports.generateIslamicHolidays = generateIslamicHolidays;
exports.generateMoroccoHolidays = generateMoroccoHolidays;
const client_1 = require("@prisma/client");
exports.FIXED_HOLIDAYS = [
    { name: 'Nouvel An', month: 0, day: 1 },
    { name: 'Fête du Travail', month: 4, day: 1 },
    { name: 'Fête du Trône', month: 6, day: 30 },
    { name: 'Allégeance Oued Eddahab', month: 7, day: 14 },
    { name: 'Révolution du Roi et du Peuple', month: 7, day: 20 },
    { name: 'Fête de la Jeunesse', month: 7, day: 21 },
    { name: 'Marche Verte', month: 10, day: 6 },
    { name: 'Fête de l\'Indépendance', month: 10, day: 18 },
];
exports.ISLAMIC_HOLIDAYS_DATES = {
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
function generateFixedHolidays(year) {
    return exports.FIXED_HOLIDAYS.map(holiday => ({
        name: holiday.name,
        date: new Date(year, holiday.month, holiday.day),
        isRecurring: true,
        type: client_1.HolidayType.NATIONAL,
    }));
}
function generateIslamicHolidays(year) {
    const holidays = [];
    const yearHolidays = exports.ISLAMIC_HOLIDAYS_DATES[year];
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
                type: client_1.HolidayType.RELIGIOUS,
            });
        }
    }
    return holidays;
}
function generateMoroccoHolidays(startYear, endYear) {
    const holidays = [];
    for (let year = startYear; year <= endYear; year++) {
        holidays.push(...generateFixedHolidays(year));
        holidays.push(...generateIslamicHolidays(year));
    }
    return holidays;
}
//# sourceMappingURL=morocco-holidays.js.map