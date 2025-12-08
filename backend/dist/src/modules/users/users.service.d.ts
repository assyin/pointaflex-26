import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.Role;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        search?: string;
        role?: Role;
        isActive?: boolean;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            isActive: boolean;
            lastLoginAt: Date;
            role: import(".prisma/client").$Enums.Role;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        avatar: string;
        lastLoginAt: Date;
        role: import(".prisma/client").$Enums.Role;
    }>;
    update(tenantId: string, id: string, dto: UpdateUserDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.Role;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        isActive: boolean;
        password: string;
        avatar: string | null;
        lastLoginAt: Date | null;
        role: import(".prisma/client").$Enums.Role;
    }>;
}
