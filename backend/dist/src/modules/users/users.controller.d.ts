import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    create(user: any, dto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.Role;
    }>;
    findAll(user: any, page?: string, limit?: string, search?: string, role?: Role, isActive?: string): Promise<{
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
    getProfile(user: any): Promise<{
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
    updateProfile(user: any, dto: UpdateUserDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.Role;
    }>;
    findOne(user: any, id: string): Promise<{
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
    update(user: any, id: string, dto: UpdateUserDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        isActive: boolean;
        role: import(".prisma/client").$Enums.Role;
    }>;
    remove(user: any, id: string): Promise<{
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
