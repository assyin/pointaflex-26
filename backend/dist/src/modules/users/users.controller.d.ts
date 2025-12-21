import { UsersService } from './users.service';
import { UserTenantRolesService } from './user-tenant-roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/assign-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { LegacyRole } from '@prisma/client';
export declare class UsersController {
    private usersService;
    private userTenantRolesService;
    constructor(usersService: UsersService, userTenantRolesService: UserTenantRolesService);
    create(user: any, dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.LegacyRole;
    }>;
    findAll(user: any, page?: string, limit?: string, search?: string, role?: LegacyRole, isActive?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            isActive: boolean;
            lastLoginAt: Date;
            role: import(".prisma/client").$Enums.LegacyRole;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getProfile(user: any): Promise<{
        roles: {
            id: string;
            code: string;
            name: string;
            description: string;
            isSystem: boolean;
        }[];
        permissions: string[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        lastLoginAt: Date;
        role: import(".prisma/client").$Enums.LegacyRole;
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            matricule: string;
            position: string;
            positionId: string;
            hireDate: Date;
            contractType: string;
            currentShift: {
                id: string;
                name: string;
                startTime: string;
                endTime: string;
            };
            department: {
                id: string;
                name: string;
                code: string;
            };
            positionRef: {
                id: string;
                name: string;
                code: string;
                category: string;
            };
            site: {
                id: string;
                name: string;
                code: string;
            };
            team: {
                id: string;
                name: string;
            };
        };
        userTenantRoles: {
            id: string;
            role: {
                id: string;
                name: string;
                code: string;
                description: string;
                isSystem: boolean;
                permissions: {
                    permission: {
                        id: string;
                        name: string;
                        code: string;
                        description: string;
                        category: string;
                    };
                }[];
            };
        }[];
    }>;
    updateProfile(user: any, dto: UpdateUserDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.LegacyRole;
    }>;
    uploadAvatar(user: any, file: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.LegacyRole;
    }>;
    removeAvatar(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.LegacyRole;
    }>;
    changePassword(user: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getPreferences(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        timezone: string;
        language: string;
        notifications: import("@prisma/client/runtime/library").JsonValue | null;
        dateFormat: string;
        timeFormat: string;
        theme: string;
    }>;
    updatePreferences(user: any, dto: UpdateUserPreferencesDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        timezone: string;
        language: string;
        notifications: import("@prisma/client/runtime/library").JsonValue | null;
        dateFormat: string;
        timeFormat: string;
        theme: string;
    }>;
    getSessions(user: any): Promise<{
        id: string;
        device: string;
        browser: string;
        os: string;
        location: string;
        ip: string;
        lastActive: string;
        isCurrent: boolean;
    }[]>;
    revokeSession(user: any, sessionId: string): Promise<{
        message: string;
    }>;
    revokeAllOtherSessions(user: any): Promise<{
        message: string;
    }>;
    getStats(user: any): Promise<{
        workedDays: {
            value: number;
            subtitle: string;
        };
        totalHours: {
            value: string;
            subtitle: string;
        };
        lateCount: {
            value: number;
            subtitle: string;
        };
        overtime: {
            value: string;
            subtitle: string;
        };
        leaveTaken: {
            value: number;
            subtitle: string;
        };
    }>;
    exportUserData(user: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            role: import(".prisma/client").$Enums.LegacyRole;
            isActive: boolean;
            createdAt: Date;
            lastLoginAt: Date;
        };
        employee: {
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string | null;
                description: string | null;
                managerId: string | null;
            };
            positionRef: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string | null;
                description: string | null;
                category: string | null;
            };
            site: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                phone: string | null;
                name: string;
                code: string | null;
                address: string | null;
                timezone: string | null;
                city: string | null;
                departmentId: string | null;
                managerId: string | null;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
                workingDays: import("@prisma/client/runtime/library").JsonValue | null;
            };
            team: {
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
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string | null;
            isActive: boolean;
            userId: string | null;
            address: string | null;
            matricule: string;
            dateOfBirth: Date | null;
            photo: string | null;
            civilite: string | null;
            situationFamiliale: string | null;
            nombreEnfants: number | null;
            cnss: string | null;
            cin: string | null;
            ville: string | null;
            rib: string | null;
            region: string | null;
            categorie: string | null;
            position: string;
            positionId: string | null;
            hireDate: Date;
            contractType: string | null;
            siteId: string | null;
            departmentId: string | null;
            teamId: string | null;
            currentShiftId: string | null;
            fingerprintData: string | null;
            faceData: string | null;
            rfidBadge: string | null;
            qrCode: string | null;
            pinCode: string | null;
        };
        roles: {
            role: {
                permissions: ({
                    permission: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        isActive: boolean;
                        name: string;
                        code: string;
                        description: string | null;
                        category: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    roleId: string;
                    permissionId: string;
                })[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string | null;
                isActive: boolean;
                name: string;
                code: string;
                description: string | null;
                isSystem: boolean;
            };
            assignedAt: Date;
        }[];
        preferences: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            timezone: string;
            language: string;
            notifications: import("@prisma/client/runtime/library").JsonValue | null;
            dateFormat: string;
            timeFormat: string;
            theme: string;
        };
        attendance: {
            timestamp: Date;
            type: import(".prisma/client").$Enums.AttendanceType;
            method: import(".prisma/client").$Enums.DeviceType;
            hasAnomaly: boolean;
        }[];
        leaves: {
            startDate: Date;
            endDate: Date;
            type: string;
            status: import(".prisma/client").$Enums.LeaveStatus;
            days: import("@prisma/client/runtime/library").Decimal;
        }[];
        overtime: {
            date: Date;
            hours: import("@prisma/client/runtime/library").Decimal;
            status: import(".prisma/client").$Enums.OvertimeStatus;
        }[];
        auditLogs: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        exportDate: string;
    }>;
    findOne(user: any, id: string): Promise<{
        roles: {
            id: string;
            code: string;
            name: string;
            description: string;
            isSystem: boolean;
        }[];
        permissions: string[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        lastLoginAt: Date;
        role: import(".prisma/client").$Enums.LegacyRole;
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            matricule: string;
            position: string;
            positionId: string;
            hireDate: Date;
            contractType: string;
            currentShift: {
                id: string;
                name: string;
                startTime: string;
                endTime: string;
            };
            department: {
                id: string;
                name: string;
                code: string;
            };
            positionRef: {
                id: string;
                name: string;
                code: string;
                category: string;
            };
            site: {
                id: string;
                name: string;
                code: string;
            };
            team: {
                id: string;
                name: string;
            };
        };
        userTenantRoles: {
            id: string;
            role: {
                id: string;
                name: string;
                code: string;
                description: string;
                isSystem: boolean;
                permissions: {
                    permission: {
                        id: string;
                        name: string;
                        code: string;
                        description: string;
                        category: string;
                    };
                }[];
            };
        }[];
    }>;
    update(user: any, id: string, dto: UpdateUserDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatar: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.LegacyRole;
    }>;
    remove(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        avatar: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        forcePasswordChange: boolean;
        role: import(".prisma/client").$Enums.LegacyRole | null;
    }>;
    getUserRoles(user: any, tenantId: string, id: string): Promise<({
        role: {
            permissions: ({
                permission: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    isActive: boolean;
                    name: string;
                    code: string;
                    description: string | null;
                    category: string;
                };
            } & {
                id: string;
                createdAt: Date;
                roleId: string;
                permissionId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
            isActive: boolean;
            name: string;
            code: string;
            description: string | null;
            isSystem: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        userId: string;
        roleId: string;
        assignedBy: string | null;
        assignedAt: Date;
    })[]>;
    assignRoles(currentUser: any, tenantId: string, id: string, dto: UpdateUserRolesDto): Promise<any[]>;
    updateRoles(currentUser: any, tenantId: string, id: string, dto: UpdateUserRolesDto): Promise<any[]>;
    removeRole(currentUser: any, tenantId: string, id: string, roleId: string): Promise<any[]>;
    getMyTenants(user: any): Promise<any[]>;
}
