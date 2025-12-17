import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LegacyRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Vérifier si le slug existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new ConflictException('Company slug already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Créer tenant + user admin en transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Créer le tenant
      const tenant = await tx.tenant.create({
        data: {
          companyName: dto.companyName,
          slug: dto.slug,
          email: dto.email,
        },
      });

      // Créer les settings par défaut
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
        },
      });

      // Créer l'utilisateur admin
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tenantId: tenant.id,
          role: LegacyRole.ADMIN_RH,
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

    // Récupérer les rôles et permissions RBAC pour le nouvel utilisateur
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

    // Extraire les codes de rôles et permissions
    const roles = userTenantRoles.map((utr) => utr.role.code);
    const permissions = new Set<string>();
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

  async login(dto: LoginDto) {
    try {
      // Utiliser findUnique si email est unique, sinon findFirst
      // Note: Si email est unique dans le schéma, findUnique est plus sûr
      const user = await this.prisma.user.findFirst({
        where: { 
          email: dto.email.toLowerCase().trim(), // Normaliser l'email
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
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is disabled');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login (ne pas faire échouer la connexion si ça échoue)
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (error) {
        this.logger.warn(`Failed to update lastLoginAt for user ${user.id}: ${error.message}`);
      }

      // Récupérer les rôles et permissions RBAC pour le tenant de l'utilisateur
      const tenantId = user.tenantId;
      let roles: string[] = [];
      let permissions = new Set<string>();

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

        // Extraire les codes de rôles et permissions (avec protection contre null)
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
      } catch (error) {
        // Si erreur lors de la récupération des rôles, utiliser le rôle legacy
        this.logger.error(`Error fetching user roles: ${error.message}`);
        if (user.role) {
          roles = [user.role];
        }
      }

      const tokens = await this.generateTokens(user);

      const { password, ...userWithoutPassword } = user;

      // Récupérer forcePasswordChange séparément si le champ existe
      let forcePasswordChange = false;
      try {
        // Utiliser une requête brute pour éviter les erreurs si le champ n'existe pas
        const result = await this.prisma.$queryRaw<Array<{ forcePasswordChange?: boolean }>>`
          SELECT "forcePasswordChange" FROM "User" WHERE id = ${user.id} LIMIT 1
        `.catch(() => null);
        
        if (result && result.length > 0 && result[0]?.forcePasswordChange !== undefined) {
          forcePasswordChange = result[0].forcePasswordChange;
        }
      } catch (error) {
        // Si le champ n'existe pas encore dans la base, utiliser false par défaut
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
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      this.logger.error(error.stack);
      
      // Si c'est déjà une UnauthorizedException, la relancer
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Sinon, lancer une erreur générique
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  async refreshTokens(userId: string) {
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
      throw new UnauthorizedException('User not found or inactive');
    }

    // Récupérer les rôles et permissions RBAC pour le tenant de l'utilisateur
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

    // Extraire les codes de rôles et permissions
    const roles = userTenantRoles.map((utr) => utr.role.code);
    const permissions = new Set<string>();
    userTenantRoles.forEach((utr) => {
      utr.role.permissions.forEach((rp) => {
        if (rp.permission.isActive) {
          permissions.add(rp.permission.code);
        }
      });
    });

    const tokens = await this.generateTokens(user);

    // Récupérer forcePasswordChange séparément si le champ existe
    let forcePasswordChange = false;
    try {
      const userWithForcePassword = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { forcePasswordChange: true },
      });
      forcePasswordChange = userWithForcePassword?.forcePasswordChange || false;
    } catch (error) {
      // Si le champ n'existe pas encore dans la base, utiliser false par défaut
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

  private async generateTokens(user: any) {
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
}
