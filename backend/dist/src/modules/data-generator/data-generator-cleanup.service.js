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
var DataGeneratorCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorCleanupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let DataGeneratorCleanupService = DataGeneratorCleanupService_1 = class DataGeneratorCleanupService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DataGeneratorCleanupService_1.name);
    }
    async cleanupAll(tenantId) {
        this.logger.log(`🧹 Démarrage du nettoyage pour tenant ${tenantId}`);
        const deleted = {};
        try {
            deleted.notifications = (await this.prisma.notification.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.notifications} notifications supprimées`);
            deleted.shiftReplacements = (await this.prisma.shiftReplacement.deleteMany({
                where: {
                    tenantId,
                },
            })).count;
            this.logger.log(`✅ ${deleted.shiftReplacements} remplacements supprimés`);
            deleted.recovery = (await this.prisma.recovery.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.recovery} récupérations supprimées`);
            deleted.overtime = (await this.prisma.overtime.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.overtime} heures supplémentaires supprimées`);
            deleted.attendance = (await this.prisma.attendance.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.attendance} pointages supprimés`);
            deleted.leaves = (await this.prisma.leave.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.leaves} congés supprimés`);
            deleted.leaveTypes = (await this.prisma.leaveType.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.leaveTypes} types de congés supprimés`);
            deleted.schedules = (await this.prisma.schedule.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.schedules} plannings supprimés`);
            deleted.devices = (await this.prisma.attendanceDevice.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.devices} terminaux supprimés`);
            deleted.holidays = (await this.prisma.holiday.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.holidays} jours fériés supprimés`);
            deleted.shifts = (await this.prisma.shift.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.shifts} shifts supprimés`);
            await this.prisma.shiftReplacement.deleteMany({
                where: {
                    OR: [
                        { originalEmployee: { tenantId } },
                        { replacementEmployee: { tenantId } },
                    ],
                },
            });
            deleted.employees = (await this.prisma.employee.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.employees} employés supprimés`);
            deleted.userTenantRoles = (await this.prisma.userTenantRole.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.userTenantRoles} liaisons RBAC supprimées`);
            deleted.users = (await this.prisma.user.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.users} utilisateurs supprimés`);
            deleted.teams = (await this.prisma.team.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.teams} équipes supprimées`);
            deleted.positions = (await this.prisma.position.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.positions} positions supprimées`);
            deleted.departments = (await this.prisma.department.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.departments} départements supprimés`);
            deleted.sites = (await this.prisma.site.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.sites} sites supprimés`);
            deleted.roles = (await this.prisma.role.deleteMany({
                where: { tenantId },
            })).count;
            this.logger.log(`✅ ${deleted.roles} rôles personnalisés supprimés`);
            const total = Object.values(deleted).reduce((sum, count) => sum + count, 0);
            this.logger.log(`✅ Nettoyage terminé: ${total} entités supprimées au total`);
            return { deleted, total };
        }
        catch (error) {
            this.logger.error(`❌ Erreur lors du nettoyage: ${error.message}`, error.stack);
            throw error;
        }
    }
    async cleanupByType(tenantId, entityType) {
        this.logger.log(`🧹 Nettoyage de ${entityType} pour tenant ${tenantId}`);
        let count = 0;
        switch (entityType.toLowerCase()) {
            case 'notifications':
                count = (await this.prisma.notification.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'replacements':
            case 'shiftreplacements':
                count = (await this.prisma.shiftReplacement.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'recovery':
                count = (await this.prisma.recovery.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'overtime':
                count = (await this.prisma.overtime.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'attendance':
                count = (await this.prisma.attendance.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'leaves':
                count = (await this.prisma.leave.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'leavetypes':
                count = (await this.prisma.leaveType.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'schedules':
                count = (await this.prisma.schedule.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'devices':
            case 'attendancedevices':
                count = (await this.prisma.attendanceDevice.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'holidays':
                count = (await this.prisma.holiday.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'shifts':
                count = (await this.prisma.shift.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'employees':
                await this.prisma.shiftReplacement.deleteMany({
                    where: {
                        OR: [
                            { originalEmployee: { tenantId } },
                            { replacementEmployee: { tenantId } },
                        ],
                    },
                });
                count = (await this.prisma.employee.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'users':
                count = (await this.prisma.user.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'teams':
                count = (await this.prisma.team.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'positions':
                count = (await this.prisma.position.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'departments':
                count = (await this.prisma.department.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            case 'sites':
                count = (await this.prisma.site.deleteMany({
                    where: { tenantId },
                })).count;
                break;
            default:
                throw new Error(`Type d'entité non supporté: ${entityType}`);
        }
        this.logger.log(`✅ ${count} ${entityType} supprimés`);
        return count;
    }
};
exports.DataGeneratorCleanupService = DataGeneratorCleanupService;
exports.DataGeneratorCleanupService = DataGeneratorCleanupService = DataGeneratorCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataGeneratorCleanupService);
//# sourceMappingURL=data-generator-cleanup.service.js.map