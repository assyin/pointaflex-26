import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { BulkMembersDto } from './dto/bulk-members.dto';
export declare class TeamsController {
    private teamsService;
    constructor(teamsService: TeamsService);
    create(user: any, dto: CreateTeamDto): Promise<{
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    findAll(user: any, page?: string, limit?: string, search?: string, rotationEnabled?: string): Promise<{
        data: ({
            _count: {
                employees: number;
                schedules: number;
            };
            employees: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
            }[];
            manager: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
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
    findOne(user: any, id: string): Promise<{
        _count: {
            employees: number;
            schedules: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    update(user: any, id: string, dto: UpdateTeamDto): Promise<{
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    remove(user: any, id: string): Promise<{
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
    addMember(user: any, id: string, dto: AddMemberDto): Promise<{
        _count: {
            employees: number;
            schedules: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    removeMember(user: any, id: string, employeeId: string): Promise<{
        _count: {
            employees: number;
            schedules: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    addMembersBulk(user: any, id: string, dto: BulkMembersDto): Promise<{
        _count: {
            employees: number;
            schedules: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    removeMembersBulk(user: any, id: string, dto: BulkMembersDto): Promise<{
        _count: {
            employees: number;
            schedules: number;
        };
        employees: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
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
    getTeamStats(user: any, id: string): Promise<{
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
