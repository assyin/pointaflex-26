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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../database/prisma.service");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
const user_tenant_roles_service_1 = require("../users/user-tenant-roles.service");
const roles_service_1 = require("../roles/roles.service");
const terminal_matricule_mapping_service_1 = require("../terminal-matricule-mapping/terminal-matricule-mapping.service");
const password_generator_util_1 = require("../../common/utils/password-generator.util");
const email_generator_util_1 = require("../../common/utils/email-generator.util");
const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
let EmployeesService = EmployeesService_1 = class EmployeesService {
    constructor(prisma, userTenantRolesService, rolesService, terminalMatriculeMappingService, cacheManager) {
        this.prisma = prisma;
        this.userTenantRolesService = userTenantRolesService;
        this.rolesService = rolesService;
        this.terminalMatriculeMappingService = terminalMatriculeMappingService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(EmployeesService_1.name);
    }
    async invalidateEmployeesCache(tenantId) {
    }
    async generateTemporaryMatricule(tenantId) {
        const lastTemp = await this.prisma.employee.findFirst({
            where: {
                tenantId,
                matricule: {
                    startsWith: 'TEMP-',
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        let nextNumber = 1;
        if (lastTemp) {
            const match = lastTemp.matricule.match(/TEMP-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        let tempMatricule = `TEMP-${String(nextNumber).padStart(3, '0')}`;
        let counter = 0;
        while (await this.prisma.employee.findUnique({
            where: {
                tenantId_matricule: {
                    tenantId,
                    matricule: tempMatricule,
                },
            },
        })) {
            nextNumber++;
            tempMatricule = `TEMP-${String(nextNumber).padStart(3, '0')}`;
            counter++;
            if (counter > 1000) {
                throw new Error('Impossible de générer un matricule temporaire unique');
            }
        }
        return tempMatricule;
    }
    async create(tenantId, createEmployeeDto, createdByUserId) {
        let finalMatricule = createEmployeeDto.matricule;
        if (!finalMatricule || finalMatricule.trim() === '') {
            finalMatricule = await this.generateTemporaryMatricule(tenantId);
            this.logger.log(`Matricule temporaire généré pour le nouvel employé: ${finalMatricule}`);
        }
        const existing = await this.prisma.employee.findUnique({
            where: {
                tenantId_matricule: {
                    tenantId,
                    matricule: finalMatricule,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Employee with matricule ${finalMatricule} already exists`);
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true, companyName: true },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            let userId = createEmployeeDto.userId;
            let generatedPassword;
            let userEmail;
            if (createEmployeeDto.createUserAccount) {
                if (createEmployeeDto.userEmail) {
                    const existingUser = await tx.user.findFirst({
                        where: { email: createEmployeeDto.userEmail },
                    });
                    if (existingUser) {
                        throw new common_1.ConflictException(`Email ${createEmployeeDto.userEmail} already exists`);
                    }
                    userEmail = createEmployeeDto.userEmail;
                }
                else {
                    userEmail = await (0, email_generator_util_1.generateUniqueEmail)(createEmployeeDto.matricule, tenant.slug, tx);
                }
                generatedPassword = (0, password_generator_util_1.generateSecurePassword)(12);
                const hashedPassword = await bcrypt.hash(generatedPassword, 10);
                const user = await tx.user.create({
                    data: {
                        email: userEmail,
                        password: hashedPassword,
                        firstName: createEmployeeDto.firstName,
                        lastName: createEmployeeDto.lastName,
                        phone: createEmployeeDto.phone,
                        tenantId: tenantId,
                        role: 'EMPLOYEE',
                        forcePasswordChange: true,
                        isActive: true,
                    },
                });
                userId = user.id;
                try {
                    const employeeRole = await tx.role.findFirst({
                        where: {
                            tenantId: tenantId,
                            code: 'EMPLOYEE',
                            isActive: true,
                        },
                    });
                    if (employeeRole) {
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
                            await tx.userTenantRole.create({
                                data: {
                                    userId: user.id,
                                    tenantId: tenantId,
                                    roleId: employeeRole.id,
                                    assignedBy: createdByUserId || user.id,
                                },
                            });
                            this.logger.log(`Role EMPLOYEE assigned to user ${user.id} in tenant ${tenantId}`);
                        }
                        else if (!existingRole.isActive) {
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
                    }
                    else {
                        this.logger.warn(`Role EMPLOYEE not found for tenant ${tenantId}. User created but no role assigned.`);
                    }
                }
                catch (error) {
                    this.logger.error(`Error assigning EMPLOYEE role: ${error.message}`);
                }
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                await tx.userCredentials.upsert({
                    where: { userId: userId },
                    create: {
                        userId: userId,
                        employeeId: undefined,
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
                this.logger.log(`User account created for employee ${createEmployeeDto.matricule}`);
                this.logger.log(`Email: ${userEmail}`);
                this.logger.log(`Password: ${generatedPassword}`);
                this.logger.warn('⚠️  Credentials logged above. Implement email sending service.');
            }
            const employee = await tx.employee.create({
                data: {
                    ...createEmployeeDto,
                    matricule: finalMatricule,
                    position: createEmployeeDto.position || 'Non spécifié',
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
            if (createEmployeeDto.createUserAccount && userId) {
                await tx.userCredentials.updateMany({
                    where: { userId: userId, employeeId: null },
                    data: { employeeId: employee.id },
                });
            }
            if (createEmployeeDto.createUserAccount && generatedPassword) {
                employee.generatedCredentials = {
                    email: userEmail,
                    password: generatedPassword,
                };
            }
            try {
                await tx.terminalMatriculeMapping.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        terminalMatricule: finalMatricule,
                        officialMatricule: finalMatricule,
                        assignedAt: new Date(),
                    },
                });
                this.logger.log(`Mapping terminal créé pour l'employé ${employee.id}: ${finalMatricule}`);
            }
            catch (error) {
                this.logger.error(`Erreur lors de la création du mapping terminal: ${error.message}`);
            }
            return employee;
        });
        await this.invalidateEmployeesCache(tenantId);
        return result;
    }
    async createUserAccount(tenantId, employeeId, createUserAccountDto, createdByUserId) {
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
            throw new common_1.NotFoundException(`Employee with ID ${employeeId} not found`);
        }
        if (employee.userId) {
            throw new common_1.ConflictException('Cet employé a déjà un compte d\'accès');
        }
        let targetRoleCode = 'EMPLOYEE';
        if (employee.managedDepartments?.length > 0 ||
            employee.managedSites?.length > 0 ||
            employee.managedTeams?.length > 0 ||
            employee.siteManagements?.length > 0) {
            targetRoleCode = 'MANAGER';
            this.logger.log(`Employee ${employee.matricule} is a manager, will assign MANAGER role`);
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true, companyName: true },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return this.prisma.$transaction(async (tx) => {
            let generatedPassword;
            let userEmail;
            try {
                if (createUserAccountDto.userEmail) {
                    const existingUser = await tx.user.findFirst({
                        where: { email: createUserAccountDto.userEmail },
                    });
                    if (existingUser) {
                        throw new common_1.ConflictException(`Email ${createUserAccountDto.userEmail} already exists`);
                    }
                    userEmail = createUserAccountDto.userEmail;
                }
                else {
                    userEmail = await (0, email_generator_util_1.generateUniqueEmail)(employee.matricule, tenant.slug, tx);
                }
                generatedPassword = (0, password_generator_util_1.generateSecurePassword)(12);
                const hashedPassword = await bcrypt.hash(generatedPassword, 10);
                const userData = {
                    email: userEmail,
                    password: hashedPassword,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    phone: employee.phone || null,
                    tenantId: tenantId,
                    role: targetRoleCode,
                    isActive: true,
                };
                try {
                    userData.forcePasswordChange = true;
                }
                catch (e) {
                }
                const user = await tx.user.create({
                    data: userData,
                });
                await tx.employee.update({
                    where: { id: employeeId },
                    data: { userId: user.id },
                });
                try {
                    const targetRole = await tx.role.findFirst({
                        where: {
                            tenantId: tenantId,
                            code: targetRoleCode,
                            isActive: true,
                        },
                    });
                    if (targetRole) {
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
                            await tx.userTenantRole.create({
                                data: {
                                    userId: user.id,
                                    tenantId: tenantId,
                                    roleId: targetRole.id,
                                    assignedBy: createdByUserId || user.id,
                                },
                            });
                            this.logger.log(`Role ${targetRoleCode} assigned to user ${user.id} in tenant ${tenantId}`);
                        }
                        else if (!existingRole.isActive) {
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
                    }
                    else {
                        this.logger.warn(`Role ${targetRoleCode} not found for tenant ${tenantId}. User created but no role assigned.`);
                    }
                }
                catch (error) {
                    this.logger.error(`Error assigning ${targetRoleCode} role: ${error.message}`);
                }
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
                this.logger.log(`User account created for existing employee ${employee.matricule}`);
                this.logger.log(`Email: ${userEmail}`);
                this.logger.log(`Password: ${generatedPassword}`);
                this.logger.warn('⚠️  Credentials logged above. Implement email sending service.');
                const userSelect = {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                };
                try {
                    userSelect.forcePasswordChange = true;
                }
                catch (e) {
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
                    throw new common_1.NotFoundException(`Employee with ID ${employeeId} not found after update`);
                }
                updatedEmployee.generatedCredentials = {
                    email: userEmail,
                    password: generatedPassword,
                };
                return updatedEmployee;
            }
            catch (error) {
                this.logger.error(`Error creating user account: ${error.message}`);
                this.logger.error(error.stack);
                throw error;
            }
        });
    }
    async findAll(tenantId, filters, userId, userPermissions) {
        const cacheKey = `employees:${tenantId}:${userId || 'none'}:${JSON.stringify(filters || {})}:${JSON.stringify(userPermissions || [])}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('employee.view_all');
        const hasViewOwn = userPermissions?.includes('employee.view_own');
        const hasViewTeam = userPermissions?.includes('employee.view_team');
        const hasViewDepartment = userPermissions?.includes('employee.view_department');
        const hasViewSite = userPermissions?.includes('employee.view_site');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                where.departmentId = managerLevel.departmentId;
            }
            else if (managerLevel.type === 'SITE') {
                if (managerLevel.siteIds && managerLevel.siteIds.length > 0) {
                    where.siteId = { in: managerLevel.siteIds };
                }
                if (managerLevel.departmentId) {
                    where.departmentId = managerLevel.departmentId;
                }
            }
            else if (managerLevel.type === 'TEAM') {
                where.teamId = managerLevel.teamId;
            }
            else if (hasViewOwn) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.id = employee.id;
                }
                else {
                    return [];
                }
            }
        }
        if (filters?.siteId)
            where.siteId = filters.siteId;
        if (filters?.departmentId)
            where.departmentId = filters.departmentId;
        if (filters?.teamId)
            where.teamId = filters.teamId;
        if (filters?.isActive !== undefined)
            where.isActive = filters.isActive;
        if (filters?.search) {
            where.OR = [
                { matricule: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const skip = (page - 1) * limit;
        const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
        const maxLimit = shouldPaginate ? limit : Math.min(limit, 1000);
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
        }
        else {
            result = data;
        }
        await this.cacheManager.set(cacheKey, result, 120000);
        return result;
    }
    async findOne(tenantId, id) {
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
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }
    async getCredentials(tenantId, employeeId) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            select: { id: true, userId: true },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${employeeId} not found`);
        }
        if (!employee.userId) {
            throw new common_1.NotFoundException('Cet employé n\'a pas de compte d\'accès');
        }
        const credentials = await this.prisma.userCredentials.findUnique({
            where: { userId: employee.userId },
        });
        if (!credentials) {
            throw new common_1.NotFoundException('Aucun identifiant trouvé pour ce compte');
        }
        if (new Date() > credentials.expiresAt) {
            throw new common_1.NotFoundException('Les identifiants ont expiré');
        }
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
    async deleteUserAccount(tenantId, employeeId) {
        return this.prisma.$transaction(async (tx) => {
            const employee = await tx.employee.findFirst({
                where: { id: employeeId, tenantId },
                select: { id: true, userId: true, firstName: true, lastName: true, matricule: true },
            });
            if (!employee) {
                throw new common_1.NotFoundException(`Employee with ID ${employeeId} not found`);
            }
            if (!employee.userId) {
                throw new common_1.NotFoundException('Cet employé n\'a pas de compte d\'accès');
            }
            const userId = employee.userId;
            try {
                await tx.userCredentials.deleteMany({
                    where: { userId },
                });
            }
            catch (error) {
                this.logger.warn(`Error deleting UserCredentials for user ${userId}: ${error.message}`);
            }
            try {
                await tx.userTenantRole.deleteMany({
                    where: { userId },
                });
            }
            catch (error) {
                this.logger.warn(`Error deleting UserTenantRole for user ${userId}: ${error.message}`);
            }
            try {
                await tx.user.delete({
                    where: { id: userId },
                });
            }
            catch (error) {
                this.logger.error(`Error deleting User ${userId}: ${error.message}`);
                throw new Error(`Erreur lors de la suppression du compte utilisateur: ${error.message}`);
            }
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
    async update(tenantId, id, updateEmployeeDto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
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
        await this.invalidateEmployeesCache(tenantId);
        return result;
    }
    async remove(tenantId, id) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        const result = await this.prisma.employee.delete({
            where: { id },
        });
        await this.invalidateEmployeesCache(tenantId);
        return result;
    }
    async updateBiometricData(tenantId, id, biometricData) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
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
    async deleteAll(tenantId) {
        const count = await this.prisma.employee.count({
            where: { tenantId },
        });
        const shiftReplacementsCount = await this.prisma.shiftReplacement.count({
            where: { tenantId },
        });
        if (shiftReplacementsCount > 0) {
            await this.prisma.shiftReplacement.deleteMany({
                where: { tenantId },
            });
            console.log(`🗑️ Deleted ${shiftReplacementsCount} shift replacements`);
        }
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
    async getStats(tenantId) {
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
    async importFromExcel(tenantId, fileBuffer) {
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            imported: [],
        };
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const dataRows = rows.slice(1);
            console.log(`📊 Import started: ${dataRows.length} employees to process`);
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = i + 2;
                try {
                    if (!row || row.length === 0 || !row[0]) {
                        continue;
                    }
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
                    const agence = String(row[11] || '').trim();
                    const rib = String(row[12] || '').trim();
                    const contrat = String(row[13] || '').trim();
                    const hireDate = this.parseExcelDate(row[14]);
                    const department = String(row[15] || '').trim();
                    const region = row[16] !== undefined ? String(row[16] || '').trim() : '';
                    const category = String(row[17] || '').trim();
                    const position = String(row[18] || '').trim();
                    const phone = String(row[19] || '').trim();
                    if (!matricule || !firstName || !lastName) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: 'Missing required fields (Matricule, First Name, or Last Name)',
                        });
                        result.failed++;
                        continue;
                    }
                    const email = `${matricule.toLowerCase().replace(/\s/g, '')}@company.local`;
                    let siteId;
                    if (region) {
                        let site = await this.prisma.site.findFirst({
                            where: {
                                tenantId,
                                name: region,
                            },
                        });
                        if (!site) {
                            site = await this.prisma.site.create({
                                data: {
                                    tenantId,
                                    name: region,
                                },
                            });
                            console.log(`📍 Created site from region: ${region}`);
                        }
                        siteId = site.id;
                    }
                    let departmentId;
                    if (department) {
                        let dept = await this.prisma.department.findFirst({
                            where: {
                                tenantId,
                                name: department,
                            },
                        });
                        if (!dept) {
                            dept = await this.prisma.department.create({
                                data: {
                                    tenantId,
                                    name: department,
                                },
                            });
                            console.log(`📁 Created department: ${department}`);
                        }
                        departmentId = dept.id;
                    }
                    let positionId;
                    if (position) {
                        let pos = await this.prisma.position.findFirst({
                            where: {
                                tenantId,
                                name: position,
                            },
                        });
                        if (!pos) {
                            pos = await this.prisma.position.create({
                                data: {
                                    tenantId,
                                    name: position,
                                    category: category || undefined,
                                },
                            });
                            console.log(`💼 Created position: ${position}`);
                        }
                        positionId = pos.id;
                    }
                    const existing = await this.prisma.employee.findUnique({
                        where: {
                            tenantId_matricule: {
                                tenantId,
                                matricule,
                            },
                        },
                    });
                    if (existing) {
                        await this.prisma.employee.update({
                            where: { id: existing.id },
                            data: {
                                firstName,
                                lastName,
                                email,
                                phone: phone || undefined,
                                position: position || undefined,
                                positionId: positionId || undefined,
                                hireDate: hireDate ? new Date(hireDate) : undefined,
                                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                                address: address || undefined,
                                contractType: contrat || undefined,
                                siteId: siteId || undefined,
                                departmentId: departmentId || undefined,
                                civilite: civilite || undefined,
                                situationFamiliale: situationFamiliale || undefined,
                                nombreEnfants: nbEnfants || undefined,
                                cnss: cnss || undefined,
                                cin: cin || undefined,
                                ville: city || undefined,
                                rib: rib || undefined,
                                region: region || undefined,
                                categorie: category || undefined,
                                isActive: true,
                            },
                        });
                        result.imported.push({ matricule, firstName, lastName });
                        result.success++;
                    }
                    else {
                        await this.prisma.employee.create({
                            data: {
                                tenantId,
                                matricule,
                                firstName,
                                lastName,
                                email,
                                phone: phone || undefined,
                                position: position || undefined,
                                positionId: positionId || undefined,
                                hireDate: hireDate ? new Date(hireDate) : new Date(),
                                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                                address: address || undefined,
                                contractType: contrat || undefined,
                                siteId: siteId || undefined,
                                departmentId: departmentId || undefined,
                                civilite: civilite || undefined,
                                situationFamiliale: situationFamiliale || undefined,
                                nombreEnfants: nbEnfants || undefined,
                                cnss: cnss || undefined,
                                cin: cin || undefined,
                                ville: city || undefined,
                                rib: rib || undefined,
                                region: region || undefined,
                                categorie: category || undefined,
                                isActive: true,
                            },
                        });
                        result.imported.push({ matricule, firstName, lastName });
                        result.success++;
                    }
                }
                catch (error) {
                    result.errors.push({
                        row: rowNumber,
                        matricule: row[0] ? String(row[0]).trim() : undefined,
                        error: error.message || 'Unknown error',
                    });
                    result.failed++;
                }
            }
            console.log(`✅ Import completed: ${result.success} success, ${result.failed} failed`);
            return result;
        }
        catch (error) {
            throw new Error(`Excel import failed: ${error.message}`);
        }
    }
    async exportToExcel(tenantId) {
        const employees = await this.prisma.employee.findMany({
            where: { tenantId },
            orderBy: { matricule: 'asc' },
            include: {
                site: true,
                department: true,
                team: true,
            },
        });
        const excelData = [
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
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Employés');
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 8 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 8 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 },
            { wch: 25 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 20 },
            { wch: 12 },
        ];
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    }
    parseExcelDate(value) {
        if (!value)
            return null;
        try {
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            if (typeof value === 'string') {
                const parts = value.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            }
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
        }
        catch (error) {
            console.warn(`Failed to parse date: ${value}`, error);
            return null;
        }
    }
    async bulkAssignToSite(tenantId, siteId, employeeIds) {
        const site = await this.prisma.site.findFirst({
            where: { id: siteId, tenantId },
        });
        if (!site) {
            throw new common_1.NotFoundException(`Site with ID ${siteId} not found`);
        }
        const where = { tenantId };
        if (employeeIds && employeeIds.length > 0) {
            where.id = { in: employeeIds };
        }
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
    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        user_tenant_roles_service_1.UserTenantRolesService,
        roles_service_1.RolesService,
        terminal_matricule_mapping_service_1.TerminalMatriculeMappingService, Object])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map