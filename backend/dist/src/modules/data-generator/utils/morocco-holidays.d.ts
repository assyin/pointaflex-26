import { HolidayType } from '@prisma/client';
export interface MoroccoHoliday {
    name: string;
    date: Date;
    isRecurring: boolean;
    type: HolidayType;
}
export declare const FIXED_HOLIDAYS: {
    name: string;
    month: number;
    day: number;
}[];
export declare const ISLAMIC_HOLIDAYS_DATES: {
    [year: number]: Array<{
        name: string;
        date: string;
        duration: number;
    }>;
};
export declare function generateFixedHolidays(year: number): MoroccoHoliday[];
export declare function generateIslamicHolidays(year: number): MoroccoHoliday[];
export declare function generateMoroccoHolidays(startYear: number, endYear: number): MoroccoHoliday[];
