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
var DataGeneratorRBACService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorRBACService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const bcrypt = require("bcrypt");
let DataGeneratorRBACService = DataGeneratorRBACService_1 = class DataGeneratorRBACService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorRBACService_1.name);
    }
    async generateUsers(tenantId, config) {
        this.logger.log(`👤 Génération des utilisateurs avec RBAC pour tenant ${tenantId}`);
        const usersPerRole = config.usersPerRole || {
            SUPER_ADMIN: 1,
            ADMIN_RH: 1,
            MANAGER: 3,
            EMPLOYEE: 10,
        };
        let totalCreated = 0;
        const defaultPasswordPlain = 'Password123!';
        const defaultPassword = await bcrypt.hash(defaultPasswordPlain, 10);
        const createdUsers = [];
        for (const [roleName, count] of Object.entries(usersPerRole)) {
            const role = await this.prisma.role.findFirst({
                where: {
                    OR: [
                        { tenantId: null, name: roleName },
                        { tenantId, name: roleName },
                    ],
                },
            });
            if (!role) {
                this.logger.warn(`⚠️ Rôle ${roleName} non trouvé, ignoré`);
                continue;
            }
            const countNum = Number(count);
            for (let i = 0; i < countNum; i++) {
                const firstName = this.generateFirstName();
                const lastName = this.generateLastName();
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@test.local`;
                const existing = await this.prisma.user.findUnique({
                    where: { email },
                });
                if (!existing) {
                    const user = await this.prisma.user.create({
                        data: {
                            email,
                            password: defaultPassword,
                            firstName,
                            lastName,
                            tenantId,
                            role: roleName,
                            isActive: true,
                        },
                    });
                    await this.prisma.userTenantRole.create({
                        data: {
                            userId: user.id,
                            tenantId,
                            roleId: role.id,
                        },
                    });
                    createdUsers.push({
                        email,
                        password: defaultPasswordPlain,
                        role: roleName,
                        firstName,
                        lastName,
                    });
                    totalCreated++;
                    this.orchestrator.incrementEntityCount('User');
                    this.orchestrator.incrementEntityCount('UserTenantRole');
                }
                else {
                    this.logger.log(`⏭️ Utilisateur ${email} existe déjà, ignoré`);
                }
            }
            this.logger.log(`✅ ${count} utilisateurs avec rôle ${roleName} traités`);
        }
        this.logger.log(`✅ Total: ${totalCreated} utilisateurs créés`);
        return {
            count: totalCreated,
            users: createdUsers,
        };
    }
    async generateCustomRoles(tenantId, customRoles) {
        this.logger.log(`🎭 Génération de ${customRoles.length} rôles personnalisés`);
        let created = 0;
        for (const roleData of customRoles) {
            const existing = await this.prisma.role.findFirst({
                where: {
                    tenantId,
                    name: roleData.name,
                },
            });
            if (!existing) {
                const role = await this.prisma.role.create({
                    data: {
                        tenantId,
                        name: roleData.name,
                        code: roleData.name.toUpperCase().replace(/\s+/g, '_'),
                        description: roleData.description || undefined,
                        isSystem: false,
                        isActive: true,
                    },
                });
                for (const permissionName of roleData.permissions) {
                    const permission = await this.prisma.permission.findFirst({
                        where: { name: permissionName },
                    });
                    if (permission) {
                        await this.prisma.rolePermission.create({
                            data: {
                                roleId: role.id,
                                permissionId: permission.id,
                            },
                        });
                    }
                    else {
                        this.logger.warn(`⚠️ Permission ${permissionName} non trouvée`);
                    }
                }
                created++;
                this.orchestrator.incrementEntityCount('Role');
            }
        }
        this.logger.log(`✅ ${created} rôles personnalisés créés`);
        return created;
    }
    generateFirstName() {
        const firstNames = [
            'Ahmed', 'Mohamed', 'Fatima', 'Aicha', 'Hassan', 'Said', 'Khadija', 'Laila',
            'Youssef', 'Omar', 'Zineb', 'Nadia', 'Karim', 'Samir', 'Salma', 'Sanae',
            'Mehdi', 'Bilal', 'Imane', 'Souad', 'Rachid', 'Nabil', 'Najat', 'Latifa',
            'Jean', 'Pierre', 'Marie', 'Sophie', 'Paul', 'Luc', 'Julie', 'Anne',
            'John', 'David', 'Sarah', 'Emma', 'Michael', 'James', 'Emily', 'Olivia',
        ];
        return firstNames[Math.floor(Math.random() * firstNames.length)];
    }
    generateLastName() {
        const lastNames = [
            'Alaoui', 'Benali', 'Cherkaoui', 'El Amrani', 'Fassi', 'Idrissi', 'Lamrani', 'Mansouri',
            'Naciri', 'Ouali', 'Rahmani', 'Saadi', 'Tazi', 'Zahiri', 'Bennani', 'Chraibi',
            'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        ];
        return lastNames[Math.floor(Math.random() * lastNames.length)];
    }
};
exports.DataGeneratorRBACService = DataGeneratorRBACService;
exports.DataGeneratorRBACService = DataGeneratorRBACService = DataGeneratorRBACService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorRBACService);
//# sourceMappingURL=data-generator-rbac.service.js.map