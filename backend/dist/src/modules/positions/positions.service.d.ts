import { PrismaService } from '../../database/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
export declare class PositionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, createPositionDto: CreatePositionDto): Promise<{
        _count: {
            employees: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        category: string | null;
    }>;
    findAll(tenantId: string, category?: string): Promise<({
        _count: {
            employees: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        category: string | null;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        _count: {
            employees: number;
        };
        employees: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
            department: {
                id: string;
                name: string;
            };
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        category: string | null;
    }>;
    update(id: string, tenantId: string, updatePositionDto: UpdatePositionDto): Promise<{
        _count: {
            employees: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        category: string | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        category: string | null;
    }>;
    getStats(tenantId: string): Promise<{
        totalPositions: number;
        totalEmployees: number;
        employeesWithoutPosition: number;
        categories: unknown[];
        positions: {
            id: string;
            name: string;
            code: string;
            category: string;
            employeeCount: number;
            percentage: string | number;
        }[];
    }>;
    getCategories(tenantId: string): Promise<string[]>;
}
