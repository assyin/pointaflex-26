import { Injectable, NotFoundException, ConflictException, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { BiometricDataDto } from './dto/biometric-data.dto';
import { ImportEmployeeDto, ImportResultDto } from './dto/import-excel.dto';
import { BulkAssignSiteDto } from './dto/bulk-assign-site.dto';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';
import { UserTenantRolesService } from '../users/user-tenant-roles.service';
import { RolesService } from '../roles/roles.service';
import { TerminalMatriculeMappingService } from '../terminal-matricule-mapping/terminal-matricule-mapping.service';
import { generateSecurePassword } from '../../common/utils/password-generator.util';
import { generateUniqueEmail } from '../../common/utils/email-generator.util';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  private cacheKeys = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private userTenantRolesService: UserTenantRolesService,
    private rolesService: RolesService,
    private terminalMatriculeMappingService: TerminalMatriculeMappingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Invalide le cache des employés pour un tenant
   * Note: cache-manager in-memory ne supporte pas les wildcards
   * Pour une vraie implémentation Redis, utiliser del avec pattern matching
   */
  private async invalidateEmployeesCache(tenantId: string) {
    try {
      // Supprimer toutes les clés trackées pour ce tenant
      const keysToDelete = Array.from(this.cacheKeys).filter(key =>
        key.startsWith(`employees:${tenantId}:`)
      );

      for (const key of keysToDelete) {
        await this.cacheManager.del(key);
        this.cacheKeys.delete(key);
      }

      this.logger.debug(`${keysToDelete.length} clé(s) de cache invalidée(s) pour le tenant ${tenantId}`);
    } catch (error) {
      // En cas d'erreur, continuer sans bloquer
      // Les clés expireront automatiquement après le TTL (2 minutes)
      this.logger.warn('Erreur lors de l\'invalidation du cache, les données seront mises à jour après expiration du TTL');
    }
  }

  /**
   * Génère un matricule temporaire unique
   */
  private async generateTemporaryMatricule(tenantId: string): Promise<string> {
    // Trouver le dernier matricule temporaire dans Employee ET TerminalMatriculeMapping
    const [lastTempEmployee, lastTempMapping] = await Promise.all([
      this.prisma.employee.findFirst({
        where: {
          tenantId,
          matricule: {
            startsWith: 'TEMP-',
          },
        },
        orderBy: {
          matricule: 'desc',
        },
      }),
      this.prisma.terminalMatriculeMapping.findFirst({
        where: {
          tenantId,
          terminalMatricule: {
            startsWith: 'TEMP-',
          },
        },
        orderBy: {
          terminalMatricule: 'desc',
        },
      }),
    ]);

    let nextNumber = 1;

    // Extraire le numéro max des deux tables
    if (lastTempEmployee) {
      const match = lastTempEmployee.matricule.match(/TEMP-(\d+)/);
      if (match) {
        nextNumber = Math.max(nextNumber, parseInt(match[1], 10) + 1);
      }
    }
    if (lastTempMapping) {
      const match = lastTempMapping.terminalMatricule.match(/TEMP-(\d+)/);
      if (match) {
        nextNumber = Math.max(nextNumber, parseInt(match[1], 10) + 1);
      }
    }

    // Générer le nouveau matricule temporaire
    let tempMatricule = `TEMP-${String(nextNumber).padStart(3, '0')}`;

    // Vérifier l'unicité dans les deux tables
    let counter = 0;
    while (true) {
      const [existsInEmployee, existsInMapping] = await Promise.all([
        this.prisma.employee.findUnique({
          where: {
            tenantId_matricule: {
              tenantId,
              matricule: tempMatricule,
            },
          },
        }),
        this.prisma.terminalMatriculeMapping.findFirst({
          where: {
            tenantId,
            terminalMatricule: tempMatricule,
          },
        }),
      ]);

      if (!existsInEmployee && !existsInMapping) {
        break; // Matricule unique trouvé
      }

      nextNumber++;
      tempMatricule = `TEMP-${String(nextNumber).padStart(3, '0')}`;
      counter++;
      if (counter > 1000) {
        // Sécurité pour éviter les boucles infinies
        throw new Error('Impossible de générer un matricule temporaire unique');
      }
    }

    return tempMatricule;
  }

  async create(tenantId: string, createEmployeeDto: CreateEmployeeDto, createdByUserId?: string) {
    // Générer un matricule temporaire si non fourni
    let finalMatricule = createEmployeeDto.matricule;
    if (!finalMatricule || finalMatricule.trim() === '') {
      finalMatricule = await this.generateTemporaryMatricule(tenantId);
      this.logger.log(
        `Matricule temporaire généré pour le nouvel employé: ${finalMatricule}`,
      );
    }

    // Vérifier si le matricule existe déjà
    const existing = await this.prisma.employee.findUnique({
      where: {
        tenantId_matricule: {
          tenantId,
          matricule: finalMatricule,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Employee with matricule ${finalMatricule} already exists`,
      );
    }

    // Récupérer le tenant pour le slug
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, companyName: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Créer Employee et User en transaction si demandé
    const result = await this.prisma.$transaction(async (tx) => {
      let userId: string | undefined = createEmployeeDto.userId;
      let generatedPassword: string | undefined;
      let userEmail: string | undefined;

      // Créer User si demandé
      if (createEmployeeDto.createUserAccount) {
        // Générer email unique
        if (createEmployeeDto.userEmail) {
          // Vérifier que l'email n'existe pas déjà
          const existingUser = await tx.user.findFirst({
            where: { email: createEmployeeDto.userEmail },
          });
          if (existingUser) {
            throw new ConflictException(`Email ${createEmployeeDto.userEmail} already exists`);
          }
          userEmail = createEmployeeDto.userEmail;
        } else {
          // Générer email automatique
          userEmail = await generateUniqueEmail(
            createEmployeeDto.matricule,
            tenant.slug,
            tx,
          );
        }

        // Générer mot de passe sécurisé
        generatedPassword = generateSecurePassword(12);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Créer User
        const user = await tx.user.create({
          data: {
            email: userEmail,
            password: hashedPassword,
            firstName: createEmployeeDto.firstName,
            lastName: createEmployeeDto.lastName,
            phone: createEmployeeDto.phone,
            tenantId: tenantId, // Legacy pour compatibilité
            role: 'EMPLOYEE' as any, // Legacy pour compatibilité
            forcePasswordChange: true, // Forcer changement à la première connexion
            isActive: true,
          },
        });

        userId = user.id;

        // Assigner le rôle EMPLOYEE via UserTenantRole (directement dans la transaction)
        try {
          const employeeRole = await tx.role.findFirst({
            where: {
              tenantId: tenantId,
              code: 'EMPLOYEE',
              isActive: true,
            },
          });

          if (employeeRole) {
            // Vérifier si le rôle n'est pas déjà assigné
            const existingRole = await tx.userTenantRole.findUnique({
              where: {
                userId_tenantId_roleId: {
                  userId: user.id,
                  tenantId: tenantId,
                  roleId: employeeRole.id,
                },
              },
            });

            if (!existingRole) {
              // Créer le UserTenantRole dans la transaction
              await tx.userTenantRole.create({
                data: {
                  userId: user.id,
                  tenantId: tenantId,
                  roleId: employeeRole.id,
                  assignedBy: createdByUserId || user.id,
                },
              });
              this.logger.log(`Role EMPLOYEE assigned to user ${user.id} in tenant ${tenantId}`);
            } else if (!existingRole.isActive) {
              // Réactiver si désactivé
              await tx.userTenantRole.update({
                where: { id: existingRole.id },
                data: {
                  isActive: true,
                  assignedBy: createdByUserId || user.id,
                  assignedAt: new Date(),
                },
              });
              this.logger.log(`Role EMPLOYEE reactivated for user ${user.id} in tenant ${tenantId}`);
            }
          } else {
            this.logger.warn(`Role EMPLOYEE not found for tenant ${tenantId}. User created but no role assigned.`);
          }
        } catch (error) {
          this.logger.error(`Error assigning EMPLOYEE role: ${error.message}`);
          // Ne pas faire échouer la création si l'assignation de rôle échoue
          // Le rôle pourra être assigné manuellement plus tard
        }

        // Stocker les credentials temporairement (expiration 7 jours)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await tx.userCredentials.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            employeeId: undefined, // Sera mis à jour après création de l'employé
            email: userEmail,
            password: generatedPassword,
            expiresAt: expiresAt,
            viewCount: 0,
          },
          update: {
            email: userEmail,
            password: generatedPassword,
            expiresAt: expiresAt,
            viewCount: 0,
            viewedAt: null,
          },
        });

        // Logger les credentials (à remplacer par envoi email plus tard)
        this.logger.log(`User account created for employee ${createEmployeeDto.matricule}`);
        this.logger.log(`Email: ${userEmail}`);
        this.logger.log(`Password: ${generatedPassword}`);
        this.logger.warn('⚠️  Credentials logged above. Implement email sending service.');
      }

      // Créer Employee
      const employee = await tx.employee.create({
        data: {
          ...createEmployeeDto,
          matricule: finalMatricule, // Utiliser le matricule final (temporaire ou fourni)
          position: createEmployeeDto.position || 'Non spécifié', // Valeur par défaut si non fourni
          tenantId,
          hireDate: new Date(createEmployeeDto.hireDate),
          dateOfBirth: createEmployeeDto.dateOfBirth
            ? new Date(createEmployeeDto.dateOfBirth)
            : undefined,
          userId: userId,
        },
        include: {
          site: true,
          department: true,
          team: true,
          currentShift: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              forcePasswordChange: true,
            },
          },
        },
      });

      // Mettre à jour l'employeeId dans UserCredentials si le compte a été créé
      if (createEmployeeDto.createUserAccount && userId) {
        await tx.userCredentials.updateMany({
          where: { userId: userId, employeeId: null },
          data: { employeeId: employee.id },
        });
      }

      // Ajouter les credentials générés dans la réponse (uniquement pour le créateur)
      if (createEmployeeDto.createUserAccount && generatedPassword) {
        (employee as any).generatedCredentials = {
          email: userEmail,
          password: generatedPassword,
        };
      }

      // Créer le mapping terminal matricule directement dans la transaction
      try {
        await tx.terminalMatriculeMapping.create({
          data: {
            tenantId,
            employeeId: employee.id,
            terminalMatricule: finalMatricule, // Matricule utilisé sur le terminal
            officialMatricule: finalMatricule, // Matricule officiel (initialement le même)
            assignedAt: new Date(),
          },
        });
        this.logger.log(
          `Mapping terminal créé pour l'employé ${employee.id}: ${finalMatricule}`,
        );
      } catch (error) {
        this.logger.error(
          `Erreur lors de la création du mapping terminal: ${error.message}`,
        );
        // Ne pas faire échouer la création de l'employé si le mapping échoue
        // Le mapping pourra être créé manuellement plus tard
      }

      return employee;
    });

    // Invalider le cache après création
    await this.invalidateEmployeesCache(tenantId);

    return result;
  }

  /**
   * Créer un compte d'accès pour un employé existant
   */
  async createUserAccount(
    tenantId: string,
    employeeId: string,
    createUserAccountDto: { userEmail?: string },
    createdByUserId?: string,
  ) {
    // Vérifier que l'employé existe et récupérer ses relations de gestion
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        managedDepartments: {
          select: { id: true },
        },
        managedSites: {
          select: { id: true },
        },
        managedTeams: {
          select: { id: true },
        },
        siteManagements: {
          select: { id: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Vérifier qu'il n'a pas déjà un compte
    if (employee.userId) {
      throw new ConflictException('Cet employé a déjà un compte d\'accès');
    }

    // Déterminer le rôle approprié basé sur les responsabilités de l'employé
    let targetRoleCode = 'EMPLOYEE'; // Rôle par défaut
    
    // Si l'employé est manager (département, site ou équipe), utiliser le rôle MANAGER
    if (
      employee.managedDepartments?.length > 0 ||
      employee.managedSites?.length > 0 ||
      employee.managedTeams?.length > 0 ||
      employee.siteManagements?.length > 0
    ) {
      targetRoleCode = 'MANAGER';
      this.logger.log(`Employee ${employee.matricule} is a manager, will assign MANAGER role`);
    }

    // Récupérer le tenant pour le slug
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, companyName: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Créer User en transaction
    return this.prisma.$transaction(async (tx) => {
      let generatedPassword: string | undefined;
      let userEmail: string | undefined;

      try {
        // Générer email unique
        if (createUserAccountDto.userEmail) {
          // Vérifier que l'email n'existe pas déjà
          const existingUser = await tx.user.findFirst({
            where: { email: createUserAccountDto.userEmail },
          });
          if (existingUser) {
            throw new ConflictException(`Email ${createUserAccountDto.userEmail} already exists`);
          }
          userEmail = createUserAccountDto.userEmail;
        } else {
          // Générer email automatique
          userEmail = await generateUniqueEmail(
            employee.matricule,
            tenant.slug,
            tx,
          );
        }

        // Générer mot de passe sécurisé
        generatedPassword = generateSecurePassword(12);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Créer User - gérer le cas où forcePasswordChange n'existe pas encore
        const userData: any = {
          email: userEmail,
          password: hashedPassword,
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone || null,
          tenantId: tenantId, // Legacy pour compatibilité
          role: targetRoleCode as any, // Utiliser le rôle déterminé (EMPLOYEE ou MANAGER)
          isActive: true,
        };

        // Ajouter forcePasswordChange seulement si le champ existe dans le schéma
        // (pour éviter les erreurs si la migration n'est pas encore appliquée)
        try {
          userData.forcePasswordChange = true;
        } catch (e) {
          // Ignorer si le champ n'existe pas
        }

        const user = await tx.user.create({
          data: userData,
        });

        // Lier l'employé au User
        await tx.employee.update({
          where: { id: employeeId },
          data: { userId: user.id },
        });

        // Assigner le rôle approprié via UserTenantRole (directement dans la transaction)
        try {
          const targetRole = await tx.role.findFirst({
            where: {
              tenantId: tenantId,
              code: targetRoleCode,
              isActive: true,
            },
          });

          if (targetRole) {
            // Vérifier si le rôle n'est pas déjà assigné
            const existingRole = await tx.userTenantRole.findUnique({
              where: {
                userId_tenantId_roleId: {
                  userId: user.id,
                  tenantId: tenantId,
                  roleId: targetRole.id,
                },
              },
            });

            if (!existingRole) {
              // Créer le UserTenantRole dans la transaction
              await tx.userTenantRole.create({
                data: {
                  userId: user.id,
                  tenantId: tenantId,
                  roleId: targetRole.id,
                  assignedBy: createdByUserId || user.id,
                },
              });
              this.logger.log(`Role ${targetRoleCode} assigned to user ${user.id} in tenant ${tenantId}`);
            } else if (!existingRole.isActive) {
              // Réactiver si désactivé
              await tx.userTenantRole.update({
                where: { id: existingRole.id },
                data: {
                  isActive: true,
                  assignedBy: createdByUserId || user.id,
                  assignedAt: new Date(),
                },
              });
              this.logger.log(`Role ${targetRoleCode} reactivated for user ${user.id} in tenant ${tenantId}`);
            }
          } else {
            this.logger.warn(`Role ${targetRoleCode} not found for tenant ${tenantId}. User created but no role assigned.`);
          }
        } catch (error) {
          this.logger.error(`Error assigning ${targetRoleCode} role: ${error.message}`);
          // Ne pas faire échouer la création si l'assignation de rôle échoue
          // Le rôle pourra être assigné manuellement plus tard
        }

        // Stocker les credentials temporairement (expiration 7 jours)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await tx.userCredentials.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            employeeId: employeeId,
            email: userEmail,
            password: generatedPassword,
            expiresAt: expiresAt,
            viewCount: 0,
          },
          update: {
            email: userEmail,
            password: generatedPassword,
            expiresAt: expiresAt,
            viewCount: 0,
            viewedAt: null,
          },
        });

        // Logger les credentials (à remplacer par envoi email plus tard)
        this.logger.log(`User account created for existing employee ${employee.matricule}`);
        this.logger.log(`Email: ${userEmail}`);
        this.logger.log(`Password: ${generatedPassword}`);
        this.logger.warn('⚠️  Credentials logged above. Implement email sending service.');

        // Retourner l'employé mis à jour avec les credentials générés
        const userSelect: any = {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        };

        // Ajouter forcePasswordChange seulement si disponible
        try {
          userSelect.forcePasswordChange = true;
        } catch (e) {
          // Ignorer si le champ n'existe pas
        }

        const updatedEmployee = await tx.employee.findUnique({
          where: { id: employeeId },
          include: {
            site: true,
            department: true,
            team: true,
            currentShift: true,
            user: {
              select: userSelect,
            },
          },
        });

        if (!updatedEmployee) {
          throw new NotFoundException(`Employee with ID ${employeeId} not found after update`);
        }

        // Ajouter les credentials générés dans la réponse (uniquement pour le créateur)
        (updatedEmployee as any).generatedCredentials = {
          email: userEmail,
          password: generatedPassword,
        };

        return updatedEmployee;
      } catch (error) {
        this.logger.error(`Error creating user account: ${error.message}`);
        this.logger.error(error.stack);
        throw error;
      }
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      siteId?: string;
      departmentId?: string;
      teamId?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    // Créer une clé de cache unique basée sur les paramètres
    const cacheKey = `employees:${tenantId}:${userId || 'none'}:${JSON.stringify(filters || {})}:${JSON.stringify(userPermissions || [])}`;

    // Vérifier le cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'employee.view_own'
    const hasViewAll = userPermissions?.includes('employee.view_all');
    const hasViewOwn = userPermissions?.includes('employee.view_own');
    const hasViewTeam = userPermissions?.includes('employee.view_team');
    const hasViewDepartment = userPermissions?.includes('employee.view_department');
    const hasViewSite = userPermissions?.includes('employee.view_site');

    // CORRECTION: Si l'utilisateur a 'employee.view_all', NE PAS appliquer le filtrage de manager
    // Les admins doivent voir tous les employés, indépendamment de leur statut de manager
    // Seuls les managers sans 'view_all' doivent être filtrés selon leur niveau hiérarchique
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      // PRIORITÉ: Le statut de manager prime sur les permissions (sauf pour 'view_all')
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : filtrer par département (tous les sites)
        where.departmentId = managerLevel.departmentId;
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par site(s) ET département
        // Un manager régional gère un département dans un ou plusieurs sites
        if (managerLevel.siteIds && managerLevel.siteIds.length > 0) {
          where.siteId = { in: managerLevel.siteIds };
        }
        // IMPORTANT: Filtrer aussi par département pour respecter les règles métier
        // Un manager régional ne voit que les employés de son département dans son site
        if (managerLevel.departmentId) {
          where.departmentId = managerLevel.departmentId;
        }
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par équipe
        where.teamId = managerLevel.teamId;
      } else if (hasViewOwn) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });

        if (employee) {
          where.id = employee.id;
        } else {
          // Si pas d'employé lié, retourner tableau vide
          return [];
        }
      }
    }

    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    if (filters?.search) {
      where.OR = [
        { matricule: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Pagination par défaut pour améliorer les performances
    const page = filters?.page || 1;
    const limit = filters?.limit || 500; // Limite par défaut de 500 éléments (augmenté pour imports)
    const skip = (page - 1) * limit;

    // Si pas de pagination demandée explicitement, limiter quand même à 2000 pour éviter les problèmes de performance
    const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
    const maxLimit = shouldPaginate ? limit : Math.min(limit, 2000);

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: shouldPaginate ? skip : undefined,
        take: maxLimit,
        include: {
          site: true,
          department: true,
          team: true,
          currentShift: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    // Préparer le résultat
    let result;
    if (shouldPaginate) {
      result = {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else {
      // Sinon, retourner juste les données (compatibilité avec l'ancien code)
      result = data;
    }

    // Mettre en cache (2 minutes pour les listes d'employés car elles changent moins fréquemment)
    await this.cacheManager.set(cacheKey, result, 120000);
    this.cacheKeys.add(cacheKey);

    return result;
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        attendance: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        leaves: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            leaveType: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  /**
   * Récupérer les credentials d'accès d'un employé (si disponibles et non expirés)
   */
  async getCredentials(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, userId: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (!employee.userId) {
      throw new NotFoundException('Cet employé n\'a pas de compte d\'accès');
    }

    const credentials = await this.prisma.userCredentials.findUnique({
      where: { userId: employee.userId },
    });

    if (!credentials) {
      throw new NotFoundException('Aucun identifiant trouvé pour ce compte');
    }

    // Vérifier l'expiration
    if (new Date() > credentials.expiresAt) {
      throw new NotFoundException('Les identifiants ont expiré');
    }

    // Mettre à jour le compteur de consultation
    await this.prisma.userCredentials.update({
      where: { id: credentials.id },
      data: {
        viewCount: credentials.viewCount + 1,
        viewedAt: new Date(),
      },
    });

    return {
      email: credentials.email,
      password: credentials.password,
      createdAt: credentials.createdAt,
      expiresAt: credentials.expiresAt,
      viewCount: credentials.viewCount + 1,
    };
  }

  /**
   * Supprimer le compte d'authentification d'un employé (sans supprimer l'employé)
   */
  async deleteUserAccount(tenantId: string, employeeId: string) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, userId: true, firstName: true, lastName: true, matricule: true },
      });

      if (!employee) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      if (!employee.userId) {
        throw new NotFoundException('Cet employé n\'a pas de compte d\'accès');
      }

      const userId = employee.userId;

      try {
        // Supprimer les UserCredentials (si existent) - utiliser deleteMany pour éviter les erreurs si n'existe pas
        await tx.userCredentials.deleteMany({
          where: { userId },
        });
      } catch (error) {
        this.logger.warn(`Error deleting UserCredentials for user ${userId}: ${error.message}`);
        // Continuer même si UserCredentials n'existe pas
      }

      try {
        // Supprimer les UserTenantRole (si existent) - utiliser deleteMany pour éviter les erreurs si n'existe pas
        await tx.userTenantRole.deleteMany({
          where: { userId },
        });
      } catch (error) {
        this.logger.warn(`Error deleting UserTenantRole for user ${userId}: ${error.message}`);
        // Continuer même si UserTenantRole n'existe pas
      }

      try {
        // Supprimer le User
        await tx.user.delete({
          where: { id: userId },
        });
      } catch (error) {
        this.logger.error(`Error deleting User ${userId}: ${error.message}`);
        throw new Error(`Erreur lors de la suppression du compte utilisateur: ${error.message}`);
      }

      // Mettre à jour l'Employee pour retirer le userId
      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: { userId: null },
        include: {
          site: true,
          department: true,
          team: true,
          currentShift: true,
        },
      });

      this.logger.log(`User account deleted for employee ${employee.matricule || employeeId} (${employee.firstName} ${employee.lastName})`);

      return {
        message: 'Compte d\'accès supprimé avec succès',
        employee: updatedEmployee,
      };
    });
  }

  async update(tenantId: string, id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const result = await this.prisma.employee.update({
      where: { id },
      data: {
        ...updateEmployeeDto,
        hireDate: updateEmployeeDto.hireDate ? new Date(updateEmployeeDto.hireDate) : undefined,
        dateOfBirth: updateEmployeeDto.dateOfBirth ? new Date(updateEmployeeDto.dateOfBirth) : undefined,
      },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Invalider le cache après modification
    await this.invalidateEmployeesCache(tenantId);

    return result;
  }

  async remove(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const result = await this.prisma.employee.delete({
      where: { id },
    });

    // Invalider le cache après suppression
    await this.invalidateEmployeesCache(tenantId);

    return result;
  }

  async updateBiometricData(tenantId: string, id: string, biometricData: BiometricDataDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.prisma.employee.update({
      where: { id },
      data: biometricData,
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        fingerprintData: true,
        faceData: true,
        rfidBadge: true,
        qrCode: true,
        pinCode: true,
      },
    });
  }

  /**
   * Delete all employees for a tenant
   * ⚠️ WARNING: This will also delete all related data (attendance, schedules, leaves, etc.)
   * due to CASCADE constraints. ShiftReplacement records are deleted first to avoid foreign key errors.
   */
  async deleteAll(tenantId: string) {
    const count = await this.prisma.employee.count({
      where: { tenantId },
    });

    // Delete ShiftReplacement records first to avoid foreign key constraint errors
    // (ShiftReplacement doesn't have onDelete: Cascade, so we need to delete them manually)
    const shiftReplacementsCount = await this.prisma.shiftReplacement.count({
      where: { tenantId },
    });

    if (shiftReplacementsCount > 0) {
      await this.prisma.shiftReplacement.deleteMany({
        where: { tenantId },
      });
      console.log(`🗑️ Deleted ${shiftReplacementsCount} shift replacements`);
    }

    // Delete all employees (this will cascade delete: attendance, schedules, leaves, overtime, recovery, notifications)
    await this.prisma.employee.deleteMany({
      where: { tenantId },
    });

    return {
      statusCode: 200,
      message: `Successfully deleted ${count} employees and ${shiftReplacementsCount} shift replacements`,
      data: { 
        employeesDeleted: count,
        shiftReplacementsDeleted: shiftReplacementsCount,
      },
    };
  }

  async getStats(tenantId: string) {
    const [total, active, inactive, bySite, byDepartment, byShift] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, isActive: true } }),
      this.prisma.employee.count({ where: { tenantId, isActive: false } }),

      this.prisma.employee.groupBy({
        by: ['siteId'],
        where: { tenantId, siteId: { not: null } },
        _count: true,
      }),

      this.prisma.employee.groupBy({
        by: ['departmentId'],
        where: { tenantId, departmentId: { not: null } },
        _count: true,
      }),

      this.prisma.employee.groupBy({
        by: ['currentShiftId'],
        where: { tenantId, currentShiftId: { not: null } },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      bySite,
      byDepartment,
      byShift,
    };
  }

  /**
   * Import employees from Excel file buffer
   */
  async importFromExcel(tenantId: string, fileBuffer: Buffer): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      success: 0,
      failed: 0,
      errors: [],
      imported: [],
      logs: [], // Nouveau: logs des actions effectuées
      totalToProcess: 0, // Nouveau: total à traiter
    };

    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1).filter((row: any) => row && row.length > 0 && row[0]);

      result.totalToProcess = dataRows.length;
      result.logs.push({ type: 'info', message: `📊 Début de l'import: ${dataRows.length} employés à traiter`, timestamp: new Date().toISOString() });
      console.log(`📊 Import started: ${dataRows.length} employees to process`);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header and 0-index

        try {

          // Parse row data (based on Excel structure)
          const matricule = String(row[0] || '').trim();
          const civilite = String(row[1] || '').trim();
          const lastName = String(row[2] || '').trim();
          const firstName = String(row[3] || '').trim();
          const situationFamiliale = String(row[4] || '').trim();
          const nbEnfants = row[5] ? parseInt(String(row[5])) : 0;
          const dateNaissance = this.parseExcelDate(row[6]);
          const cnss = String(row[7] || '').trim();
          const cin = String(row[8] || '').trim();
          const address = String(row[9] || '').trim();
          const city = String(row[10] || '').trim();
          const agence = String(row[11] || '').trim(); // Information supplémentaire, pas le site
          const rib = String(row[12] || '').trim();
          const contrat = String(row[13] || '').trim();
          const hireDate = this.parseExcelDate(row[14]);
          const department = String(row[15] || '').trim();
          // ⚠️ CORRECTION: "Région" (col 16) est le Site, pas "Agence" (col 11)
          const region = row[16] !== undefined ? String(row[16] || '').trim() : '';
          const category = String(row[17] || '').trim();
          const position = String(row[18] || '').trim();
          const phone = String(row[19] || '').trim();

          // ========== NOUVELLES COLONNES (20-25) ==========
          const emailFromFile = row[20] ? String(row[20]).trim() : undefined;
          const shiftName = row[21] ? String(row[21]).trim() : undefined;
          const teamName = row[22] ? String(row[22]).trim() : undefined;
          const isEligibleOvertimeStr = row[23] ? String(row[23]).toUpperCase().trim() : '';
          const isEligibleForOvertime = isEligibleOvertimeStr === 'NON' ? false : true; // Default: true
          const maxOvertimeHoursPerMonth = row[24] ? parseFloat(String(row[24])) : undefined;
          const rfidBadge = row[25] ? String(row[25]).trim() : undefined;

          // Validate required fields
          if (!matricule || !firstName || !lastName) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: 'Missing required fields (Matricule, First Name, or Last Name)',
            });
            result.failed++;
            continue;
          }

          // Generate email from matricule
          const email = `${matricule.toLowerCase().replace(/\s/g, '')}@company.local`;

          // Handle Site (Région) - create if doesn't exist
          // ⚠️ CORRECTION: "Région" (col 16) est le Site, pas "Agence" (col 11)
          let siteId: string | undefined;
          if (region) {
            let site = await this.prisma.site.findFirst({
              where: {
                tenantId,
                name: region,
              },
            });

            if (!site) {
              // Create site automatically from region name
              site = await this.prisma.site.create({
                data: {
                  tenantId,
                  name: region,
                },
              });
              result.logs.push({ type: 'site', message: `📍 Nouveau site créé: ${region}`, timestamp: new Date().toISOString() });
              console.log(`📍 Created site from region: ${region}`);
            }

            siteId = site.id;
          }

          // Handle department - create if doesn't exist
          let departmentId: string | undefined;
          if (department) {
            let dept = await this.prisma.department.findFirst({
              where: {
                tenantId,
                name: department,
              },
            });

            if (!dept) {
              // Create department automatically
              dept = await this.prisma.department.create({
                data: {
                  tenantId,
                  name: department,
                },
              });
              result.logs.push({ type: 'department', message: `📁 Nouveau département créé: ${department}`, timestamp: new Date().toISOString() });
              console.log(`📁 Created department: ${department}`);
            }

            departmentId = dept.id;
          }

          // Handle Position (Fonction/Poste) - create if doesn't exist
          let positionId: string | undefined;
          if (position) {
            let pos = await this.prisma.position.findFirst({
              where: {
                tenantId,
                name: position,
              },
            });

            if (!pos) {
              // Create position automatically
              pos = await this.prisma.position.create({
                data: {
                  tenantId,
                  name: position,
                  category: category || undefined,
                },
              });
              result.logs.push({ type: 'position', message: `💼 Nouvelle fonction créée: ${position}`, timestamp: new Date().toISOString() });
              console.log(`💼 Created position: ${position}`);
            }

            positionId = pos.id;
          }

          // ========== Handle Shift (nouvelles colonnes) ==========
          let currentShiftId: string | undefined;
          if (shiftName) {
            // Chercher par nom OU par code (insensible à la casse)
            const shift = await this.prisma.shift.findFirst({
              where: {
                tenantId,
                OR: [
                  { name: { equals: shiftName, mode: 'insensitive' } },
                  { code: { equals: shiftName, mode: 'insensitive' } },
                ],
              },
            });

            if (shift) {
              currentShiftId = shift.id;
              result.logs.push({ type: 'info', message: `🕐 Shift assigné: ${shift.name} (${shift.code})`, timestamp: new Date().toISOString() });
            } else {
              result.logs.push({ type: 'warning', message: `⚠️ Shift non trouvé: ${shiftName} (ignoré)`, timestamp: new Date().toISOString() });
              console.log(`⚠️ Shift non trouvé: ${shiftName} (ignoré)`);
            }
          }

          // ========== Handle Team (nouvelles colonnes) ==========
          let teamId: string | undefined;
          if (teamName) {
            let team = await this.prisma.team.findFirst({
              where: {
                tenantId,
                name: teamName,
              },
            });

            if (!team) {
              // Create team automatically with generated code
              const teamCode = teamName
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 10);
              team = await this.prisma.team.create({
                data: {
                  tenantId,
                  name: teamName,
                  code: teamCode || `TEAM${Date.now()}`,
                },
              });
              result.logs.push({ type: 'team', message: `👥 Nouvelle équipe créée: ${teamName}`, timestamp: new Date().toISOString() });
              console.log(`👥 Created team: ${teamName} (code: ${team.code})`);
            }

            teamId = team.id;
          }

          // Check if employee already exists
          const existing = await this.prisma.employee.findUnique({
            where: {
              tenantId_matricule: {
                tenantId,
                matricule,
              },
            },
          });

          if (existing) {
            // Update existing employee
            await this.prisma.employee.update({
              where: { id: existing.id },
              data: {
                firstName,
                lastName,
                email: emailFromFile || email, // Priorité à l'email du fichier
                phone: phone || undefined,
                position: position || undefined, // Keep for compatibility
                positionId: positionId || undefined, // New: relation to Position
                hireDate: hireDate ? new Date(hireDate) : undefined,
                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                address: address || undefined,
                contractType: contrat || undefined,
                siteId: siteId || undefined, // New: assign site from region
                departmentId: departmentId || undefined,
                // New fields from Excel
                civilite: civilite || undefined,
                situationFamiliale: situationFamiliale || undefined,
                nombreEnfants: nbEnfants || undefined,
                cnss: cnss || undefined,
                cin: cin || undefined,
                ville: city || undefined,
                rib: rib || undefined,
                region: region || undefined, // Keep as text field for compatibility
                categorie: category || undefined,
                isActive: true,
                // ========== NOUVELLES COLONNES (20-25) ==========
                currentShiftId: currentShiftId || existing.currentShiftId, // Ne pas écraser si non fourni
                teamId: teamId || existing.teamId, // Ne pas écraser si non fourni
                isEligibleForOvertime: isEligibleForOvertime,
                maxOvertimeHoursPerMonth: maxOvertimeHoursPerMonth !== undefined ? maxOvertimeHoursPerMonth : existing.maxOvertimeHoursPerMonth,
                rfidBadge: rfidBadge || existing.rfidBadge, // Ne pas écraser si non fourni
              },
            });

            result.imported.push({ matricule, firstName, lastName });
            result.success++;
          } else {
            // Create new employee
            await this.prisma.employee.create({
              data: {
                tenantId,
                matricule,
                firstName,
                lastName,
                email: emailFromFile || email, // Priorité à l'email du fichier
                phone: phone || undefined,
                position: position || undefined, // Keep for compatibility
                positionId: positionId || undefined, // New: relation to Position
                hireDate: hireDate ? new Date(hireDate) : new Date(),
                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                address: address || undefined,
                contractType: contrat || undefined,
                siteId: siteId || undefined, // New: assign site from region
                departmentId: departmentId || undefined,
                // New fields from Excel
                civilite: civilite || undefined,
                situationFamiliale: situationFamiliale || undefined,
                nombreEnfants: nbEnfants || undefined,
                cnss: cnss || undefined,
                cin: cin || undefined,
                ville: city || undefined,
                rib: rib || undefined,
                region: region || undefined, // Keep as text field for compatibility
                categorie: category || undefined,
                isActive: true,
                // ========== NOUVELLES COLONNES (20-25) ==========
                currentShiftId: currentShiftId || undefined,
                teamId: teamId || undefined,
                isEligibleForOvertime: isEligibleForOvertime,
                maxOvertimeHoursPerMonth: maxOvertimeHoursPerMonth || undefined,
                rfidBadge: rfidBadge || undefined,
              },
            });

            result.imported.push({ matricule, firstName, lastName });
            result.success++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            matricule: row[0] ? String(row[0]).trim() : undefined,
            error: error.message || 'Unknown error',
          });
          result.failed++;
        }
      }

      result.logs.push({ type: 'success', message: `✅ Import terminé: ${result.success} succès, ${result.failed} échec(s)`, timestamp: new Date().toISOString() });
      console.log(`✅ Import completed: ${result.success} success, ${result.failed} failed`);

      return result;
    } catch (error) {
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }

  /**
   * Export employees to Excel file buffer
   */
  async exportToExcel(tenantId: string): Promise<Buffer> {
    // Get all employees
    const employees = await this.prisma.employee.findMany({
      where: { tenantId },
      orderBy: { matricule: 'asc' },
      include: {
        site: true,
        department: true,
        team: true,
      },
    });

    // Prepare data for Excel
    const excelData = [
      // Header row
      [
        'Matricule',
        'Civilité',
        'Nom',
        'Prénom',
        'Situation Familiale',
        'Nb Enf',
        'Date de Naissance',
        'N° CNSS',
        'N° CIN',
        'Adresse',
        'Ville',
        "Nom d'agence",
        'RIB',
        'Contrat',
        "Date d'Embauche",
        'Département',
        'Région',
        'Catégorie',
        'Fonction',
        'N° téléphone',
      ],
    ];

    // Data rows
    employees.forEach((emp) => {
      excelData.push([
        emp.matricule,
        emp.civilite || '',
        emp.lastName,
        emp.firstName,
        emp.situationFamiliale || '',
        emp.nombreEnfants?.toString() || '',
        emp.dateOfBirth ? this.formatDate(emp.dateOfBirth) : '',
        emp.cnss || '',
        emp.cin || '',
        emp.address || '',
        emp.ville || '',
        emp.site?.name || '',
        emp.rib || '',
        emp.contractType || '',
        emp.hireDate ? this.formatDate(emp.hireDate) : '',
        emp.department?.name || '',
        emp.region || '',
        emp.categorie || '',
        emp.position || '',
        emp.phone || '',
      ]);
    });

    // Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employés');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Matricule
      { wch: 8 },  // Civilité
      { wch: 15 }, // Nom
      { wch: 15 }, // Prénom
      { wch: 18 }, // Situation Familiale
      { wch: 8 },  // Nb Enf
      { wch: 12 }, // Date de Naissance
      { wch: 15 }, // CNSS
      { wch: 10 }, // CIN
      { wch: 30 }, // Adresse
      { wch: 15 }, // Ville
      { wch: 20 }, // Nom d'agence
      { wch: 25 }, // RIB
      { wch: 10 }, // Contrat
      { wch: 12 }, // Date d'Embauche
      { wch: 15 }, // Département
      { wch: 15 }, // Région
      { wch: 12 }, // Catégorie
      { wch: 20 }, // Fonction
      { wch: 12 }, // Téléphone
    ];

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Parse Excel date (can be date object, string, or serial number)
   */
  private parseExcelDate(value: any): string | null {
    if (!value) return null;

    try {
      // If it's already a date object
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }

      // If it's a string in DD/MM/YYYY format
      if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // If it's an Excel serial number
      if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          const year = date.y;
          const month = String(date.m).padStart(2, '0');
          const day = String(date.d).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }

      return null;
    } catch (error) {
      console.warn(`Failed to parse date: ${value}`, error);
      return null;
    }
  }

  /**
   * Assigner des employés à un site en masse
   */
  async bulkAssignToSite(tenantId: string, siteId: string, employeeIds?: string[]) {
    // Vérifier que le site existe et appartient au tenant
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // Construire la condition where
    const where: any = { tenantId };
    
    // Si des IDs spécifiques sont fournis, filtrer par ces IDs
    if (employeeIds && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    // Mettre à jour tous les employés correspondants
    const result = await this.prisma.employee.updateMany({
      where,
      data: {
        siteId,
      },
    });

    return {
      success: true,
      message: `${result.count} employé(s) assigné(s) au site ${site.name}`,
      count: result.count,
      site: {
        id: site.id,
        name: site.name,
        code: site.code,
      },
    };
  }

  /**
   * Format date to DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
