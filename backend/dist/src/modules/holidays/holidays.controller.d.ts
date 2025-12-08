import { HttpStatus } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
export declare class HolidaysController {
    private readonly holidaysService;
    constructor(holidaysService: HolidaysService);
    create(user: any, dto: CreateHolidayDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        type: import(".prisma/client").$Enums.HolidayType;
        date: Date;
        isRecurring: boolean;
    }>;
    findAll(user: any, year?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            date: Date;
            isRecurring: boolean;
        }[];
        total: number;
    }>;
    findOne(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        type: import(".prisma/client").$Enums.HolidayType;
        date: Date;
        isRecurring: boolean;
    }>;
    update(user: any, id: string, dto: UpdateHolidayDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        type: import(".prisma/client").$Enums.HolidayType;
        date: Date;
        isRecurring: boolean;
    }>;
    remove(user: any, id: string): Promise<{
        message: string;
    }>;
    importCsv(user: any, file: Express.Multer.File): Promise<{
        statusCode: HttpStatus;
        message: string;
        data?: undefined;
    } | {
        statusCode: HttpStatus;
        message: string;
        data: {
            success: number;
            skipped: number;
            errors: string[];
            total: number;
        };
    }>;
}
