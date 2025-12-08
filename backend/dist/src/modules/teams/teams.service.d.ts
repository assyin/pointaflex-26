import { PrismaService } from '../../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { BulkMembersDto } from './dto/bulk-members.dto';
export declare class TeamsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateTeamDto): Promise<{
        employees: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        search?: string;
        rotationEnabled?: boolean;
    }): Promise<{
        data: ({
            _count: {
                schedules: number;
                employees: number;
            };
            employees: {
                id: string;
                matricule: string;
                firstName: string;
                lastName: string;
            }[];
            manager: {
                id: string;
                matricule: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            description: string | null;
            managerId: string | null;
            rotationEnabled: boolean;
            rotationCycleDays: number | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        _count: {
            schedules: number;
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
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateTeamDto): Promise<{
        employees: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    addMember(tenantId: string, teamId: string, dto: AddMemberDto): Promise<{
        _count: {
            schedules: number;
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
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    removeMember(tenantId: string, teamId: string, employeeId: string): Promise<{
        _count: {
            schedules: number;
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
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    addMembersBulk(tenantId: string, teamId: string, dto: BulkMembersDto): Promise<{
        _count: {
            schedules: number;
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
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    removeMembersBulk(tenantId: string, teamId: string, dto: BulkMembersDto): Promise<{
        _count: {
            schedules: number;
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
        code: string;
        description: string | null;
        managerId: string | null;
        rotationEnabled: boolean;
        rotationCycleDays: number | null;
    }>;
    getTeamStats(tenantId: string, teamId: string): Promise<{
        team: {
            id: string;
            name: string;
            code: string;
        };
        members: {
            total: number;
            presentToday: number;
            absentToday: number;
        };
        schedules: {
            total: number;
            thisMonth: number;
            today: number;
        };
        shiftDistribution: {
            percentage: number;
            shiftId: string;
            shiftName: string;
            shiftType: string;
            count: number;
        }[];
    }>;
}
