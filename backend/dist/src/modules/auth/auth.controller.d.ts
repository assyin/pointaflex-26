import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        user: {
            roles: string[];
            permissions: string[];
            id: string;
            tenantId: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.LegacyRole;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            roles: string[];
            permissions: string[];
            forcePasswordChange: boolean;
            id: string;
            tenantId: string;
            email: string;
            firstName: string;
            lastName: string;
            avatar: string;
            isActive: boolean;
            role: import(".prisma/client").$Enums.LegacyRole;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(user: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.LegacyRole;
            tenantId: string;
            roles: string[];
            permissions: string[];
            forcePasswordChange: boolean;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    logout(): Promise<{
        message: string;
    }>;
}
