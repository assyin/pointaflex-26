import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private generateUniqueCode;
    create(tenantId: string, createDepartmentDto: CreateDepartmentDto): Promise<{
        _count: {
            employees: number;
        };
        manager: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        managerId: string | null;
    }>;
    findAll(tenantId: string, userId?: string, userPermissions?: string[]): Promise<({
        _count: {
            employees: number;
        };
        manager: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        managerId: string | null;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        _count: {
            employees: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        }[];
        manager: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        managerId: string | null;
    }>;
    update(id: string, tenantId: string, updateDepartmentDto: UpdateDepartmentDto): Promise<{
        _count: {
            employees: number;
        };
        manager: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        managerId: string | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string | null;
        description: string | null;
        managerId: string | null;
    }>;
    getStats(tenantId: string, userId?: string, userPermissions?: string[]): Promise<{
        totalDepartments: number;
        totalEmployees: number;
        employeesWithoutDepartment: number;
        departments: {
            id: string;
            name: string;
            code: string;
            employeeCount: number;
            percentage: string | number;
        }[];
    }>;
}
