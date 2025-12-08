import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    create(tenantId: string, createDepartmentDto: CreateDepartmentDto): Promise<{
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
        managerId: string | null;
    }>;
    findAll(tenantId: string): Promise<({
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
        managerId: string | null;
    })[]>;
    getStats(tenantId: string): Promise<{
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
            position: string;
        }[];
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
}
