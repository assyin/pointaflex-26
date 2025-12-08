import { HolidayType } from '@prisma/client';
export declare class CreateHolidayDto {
    name: string;
    date: string;
    type: HolidayType;
    isRecurring?: boolean;
}
