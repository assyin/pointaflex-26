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
        code: string | null;
        name: string;
        description: string | null;
        managerId: string | null;
    }>;
    findAll(tenantId: string, user: any): Promise<({
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
        code: string | null;
        name: string;
        description: string | null;
        managerId: string | null;
    })[]>;
    getStats(tenantId: string, user: any): Promise<{
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
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        }[];
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
        code: string | null;
        name: string;
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
        code: string | null;
        name: string;
        description: string | null;
        managerId: string | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        code: string | null;
        name: string;
        description: string | null;
        managerId: string | null;
    }>;
    getSettings(id: string, tenantId: string): Promise<{
        departmentId: string;
        departmentName: string;
        settings: {
            wrongTypeDetectionEnabled: boolean;
            wrongTypeAutoCorrect: boolean;
            wrongTypeShiftMarginMinutes: number;
        };
        tenantDefaults: {
            enableWrongTypeDetection: boolean;
            wrongTypeAutoCorrect: boolean;
            wrongTypeShiftMarginMinutes: number;
        };
    }>;
    updateSettings(id: string, tenantId: string, data: {
        wrongTypeDetectionEnabled?: boolean | null;
        wrongTypeAutoCorrect?: boolean | null;
        wrongTypeShiftMarginMinutes?: number | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        departmentId: string;
        wrongTypeAutoCorrect: boolean | null;
        wrongTypeShiftMarginMinutes: number | null;
        wrongTypeDetectionEnabled: boolean | null;
    }>;
}
