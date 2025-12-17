"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findFirst({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const existingTenant = await this.prisma.tenant.findUnique({
            where: { slug: dto.slug },
        });
        if (existingTenant) {
            throw new common_1.ConflictException('Company slug already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const result = await this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    companyName: dto.companyName,
                    slug: dto.slug,
                    email: dto.email,
                },
            });
            await tx.tenantSettings.create({
                data: {
                    tenantId: tenant.id,
                },
            });
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    tenantId: tenant.id,
                    role: client_1.LegacyRole.ADMIN_RH,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    tenantId: true,
                },
            });
            return { tenant, user };
        });
        const userTenantRoles = await this.prisma.userTenantRole.findMany({
            where: {
                userId: result.user.id,
                tenantId: result.user.tenantId,
                isActive: true,
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        const roles = userTenantRoles.map((utr) => utr.role.code);
        const permissions = new Set();
        userTenantRoles.forEach((utr) => {
            utr.role.permissions.forEach((rp) => {
                if (rp.permission.isActive) {
                    permissions.add(rp.permission.code);
                }
            });
        });
        const tokens = await this.generateTokens(result.user);
        return {
            ...tokens,
            user: {
                ...result.user,
                roles: Array.from(roles),
                permissions: Array.from(permissions),
            },
        };
    }
    async login(dto) {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    email: dto.email.toLowerCase().trim(),
                },
                select: {
                    id: true,
                    email: true,
                    password: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    tenantId: true,
                    isActive: true,
                    avatar: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            if (!user.isActive) {
                throw new common_1.UnauthorizedException('Account is disabled');
            }
            const isPasswordValid = await bcrypt.compare(dto.password, user.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            try {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });
            }
            catch (error) {
                this.logger.warn(`Failed to update lastLoginAt for user ${user.id}: ${error.message}`);
            }
            const tenantId = user.tenantId;
            let roles = [];
            let permissions = new Set();
            try {
                const userTenantRoles = tenantId
                    ? await this.prisma.userTenantRole.findMany({
                        where: {
                            userId: user.id,
                            tenantId,
                            isActive: true,
                        },
                        include: {
                            role: {
                                include: {
                                    permissions: {
                                        include: {
                                            permission: true,
                                        },
                                    },
                                },
                            },
                        },
                    })
                    : [];
                roles = userTenantRoles
                    .filter((utr) => utr.role && utr.role.code)
                    .map((utr) => utr.role.code);
                userTenantRoles.forEach((utr) => {
                    if (utr.role && utr.role.permissions) {
                        utr.role.permissions.forEach((rp) => {
                            if (rp.permission && rp.permission.isActive && rp.permission.code) {
                                permissions.add(rp.permission.code);
                            }
                        });
                    }
                });
            }
            catch (error) {
                this.logger.error(`Error fetching user roles: ${error.message}`);
                if (user.role) {
                    roles = [user.role];
                }
            }
            const tokens = await this.generateTokens(user);
            const { password, ...userWithoutPassword } = user;
            let forcePasswordChange = false;
            try {
                const result = await this.prisma.$queryRaw `
          SELECT "forcePasswordChange" FROM "User" WHERE id = ${user.id} LIMIT 1
        `.catch(() => null);
                if (result && result.length > 0 && result[0]?.forcePasswordChange !== undefined) {
                    forcePasswordChange = result[0].forcePasswordChange;
                }
            }
            catch (error) {
                forcePasswordChange = false;
            }
            return {
                ...tokens,
                user: {
                    ...userWithoutPassword,
                    roles: Array.from(roles),
                    permissions: Array.from(permissions),
                    forcePasswordChange,
                },
            };
        }
        catch (error) {
            this.logger.error(`Login error: ${error.message}`);
            this.logger.error(error.stack);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Login failed. Please try again.');
        }
    }
    async refreshTokens(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                tenantId: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        const tenantId = user.tenantId;
        const userTenantRoles = tenantId
            ? await this.prisma.userTenantRole.findMany({
                where: {
                    userId: user.id,
                    tenantId,
                    isActive: true,
                },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            })
            : [];
        const roles = userTenantRoles.map((utr) => utr.role.code);
        const permissions = new Set();
        userTenantRoles.forEach((utr) => {
            utr.role.permissions.forEach((rp) => {
                if (rp.permission.isActive) {
                    permissions.add(rp.permission.code);
                }
            });
        });
        const tokens = await this.generateTokens(user);
        let forcePasswordChange = false;
        try {
            const userWithForcePassword = await this.prisma.user.findUnique({
                where: { id: user.id },
                select: { forcePasswordChange: true },
            });
            forcePasswordChange = userWithForcePassword?.forcePasswordChange || false;
        }
        catch (error) {
            forcePasswordChange = false;
        }
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
                roles: Array.from(roles),
                permissions: Array.from(permissions),
                forcePasswordChange,
            },
        };
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET || 'your-secret-key',
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map