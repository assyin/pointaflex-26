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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateAllDataDto = exports.NotificationsConfigDto = exports.ReplacementsConfigDto = exports.DevicesConfigDto = exports.RecoveryConfigDto = exports.OvertimeConfigDto = exports.EmployeesConfigDto = exports.StructureConfigDto = exports.RBACConfigDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class TenantConfigDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nom de l\'entreprise' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Slug unique' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Email de contact' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Téléphone' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Adresse' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ville' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Pays' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Timezone' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TenantConfigDto.prototype, "timezone", void 0);
class RBACConfigDto {
}
exports.RBACConfigDto = RBACConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Générer les rôles système (vérifier init-rbac.ts)' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], RBACConfigDto.prototype, "generateSystemRoles", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Générer des rôles personnalisés' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], RBACConfigDto.prototype, "generateCustomRoles", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Rôles personnalisés' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], RBACConfigDto.prototype, "customRoles", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre d\'utilisateurs par rôle' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RBACConfigDto.prototype, "usersPerRole", void 0);
class StructureConfigDto {
}
exports.StructureConfigDto = StructureConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de sites à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructureConfigDto.prototype, "sitesCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sites personnalisés' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], StructureConfigDto.prototype, "sites", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de départements à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructureConfigDto.prototype, "departmentsCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Départements personnalisés' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], StructureConfigDto.prototype, "departments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de positions à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructureConfigDto.prototype, "positionsCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Positions personnalisées' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], StructureConfigDto.prototype, "positions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre d\'équipes à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], StructureConfigDto.prototype, "teamsCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Équipes personnalisées' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], StructureConfigDto.prototype, "teams", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Assigner des managers (hiérarchie)' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], StructureConfigDto.prototype, "assignManagers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution des managers' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], StructureConfigDto.prototype, "managerDistribution", void 0);
class EmployeesConfigDto {
}
exports.EmployeesConfigDto = EmployeesConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre d\'employés à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EmployeesConfigDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Lier aux utilisateurs RBAC' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EmployeesConfigDto.prototype, "linkToUsers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Assigner aux structures (sites/départements/positions/équipes)' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EmployeesConfigDto.prototype, "assignToStructures", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution des employés' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EmployeesConfigDto.prototype, "distribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Options de génération de données' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EmployeesConfigDto.prototype, "dataOptions", void 0);
class ShiftsConfigDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Créer les shifts par défaut (Matin, Soir, Nuit)' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ShiftsConfigDto.prototype, "createDefault", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Shifts personnalisés' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ShiftsConfigDto.prototype, "custom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Assigner aux employés' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ShiftsConfigDto.prototype, "assignToEmployees", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution par shift' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ShiftsConfigDto.prototype, "distribution", void 0);
class HolidaysConfigDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Générer les jours fériés marocains' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], HolidaysConfigDto.prototype, "generateMoroccoHolidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Année de début' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], HolidaysConfigDto.prototype, "startYear", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Année de fin' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], HolidaysConfigDto.prototype, "endYear", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Jours fériés personnalisés' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], HolidaysConfigDto.prototype, "customHolidays", void 0);
class SchedulesConfigDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de début (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SchedulesConfigDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de fin (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SchedulesConfigDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Pourcentage d\'employés avec planning' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SchedulesConfigDto.prototype, "coverage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exclure les jours fériés' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SchedulesConfigDto.prototype, "excludeHolidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exclure les weekends' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SchedulesConfigDto.prototype, "excludeWeekends", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution par shift' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SchedulesConfigDto.prototype, "distribution", void 0);
class LeavesConfigDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de début (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LeavesConfigDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de fin (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LeavesConfigDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Pourcentage d\'employés avec congés' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LeavesConfigDto.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre moyen de jours par employé' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LeavesConfigDto.prototype, "averageDaysPerEmployee", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution par type de congé' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], LeavesConfigDto.prototype, "distribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration du workflow d\'approbation' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], LeavesConfigDto.prototype, "workflow", void 0);
class AttendanceConfigDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de début (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AttendanceConfigDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de fin (YYYY-MM-DD)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AttendanceConfigDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution des scénarios' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], AttendanceConfigDto.prototype, "distribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exclure les jours fériés' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "excludeHolidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exclure les weekends' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "excludeWeekends", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exclure les congés approuvés' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "excludeLeaves", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Générer des heures supplémentaires' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "generateOvertime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Seuil d\'heures par jour pour générer overtime' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AttendanceConfigDto.prototype, "overtimeThreshold", void 0);
class OvertimeConfigDto {
}
exports.OvertimeConfigDto = OvertimeConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre d\'overtime à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OvertimeConfigDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution des statuts' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], OvertimeConfigDto.prototype, "statusDistribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre moyen d\'heures' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OvertimeConfigDto.prototype, "averageHours", void 0);
class RecoveryConfigDto {
}
exports.RecoveryConfigDto = RecoveryConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de recovery à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], RecoveryConfigDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Convertir depuis overtime' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], RecoveryConfigDto.prototype, "convertFromOvertime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Taux de conversion (% d\'overtime à convertir)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], RecoveryConfigDto.prototype, "conversionRate", void 0);
class DevicesConfigDto {
}
exports.DevicesConfigDto = DevicesConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de devices par site' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], DevicesConfigDto.prototype, "perSite", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Types de devices' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DevicesConfigDto.prototype, "deviceTypes", void 0);
class ReplacementsConfigDto {
}
exports.ReplacementsConfigDto = ReplacementsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de remplacements à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ReplacementsConfigDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Distribution des statuts' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ReplacementsConfigDto.prototype, "statusDistribution", void 0);
class NotificationsConfigDto {
}
exports.NotificationsConfigDto = NotificationsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de notifications à générer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], NotificationsConfigDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Types de notifications' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], NotificationsConfigDto.prototype, "types", void 0);
class GlobalOptionsDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Marquer toutes les données générées' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GlobalOptionsDto.prototype, "markAsGenerated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Utiliser des transactions pour cohérence' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GlobalOptionsDto.prototype, "useTransactions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Arrêter en cas d\'erreur ou continuer' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GlobalOptionsDto.prototype, "stopOnError", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Générer certaines entités en parallèle' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GlobalOptionsDto.prototype, "generateInParallel", void 0);
class GenerateAllDataDto {
}
exports.GenerateAllDataDto = GenerateAllDataDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration du tenant' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TenantConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", TenantConfigDto)
], GenerateAllDataDto.prototype, "tenant", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration RBAC' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RBACConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", RBACConfigDto)
], GenerateAllDataDto.prototype, "rbac", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration de la structure organisationnelle' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => StructureConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", StructureConfigDto)
], GenerateAllDataDto.prototype, "structure", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des employés' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmployeesConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", EmployeesConfigDto)
], GenerateAllDataDto.prototype, "employees", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des shifts' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ShiftsConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ShiftsConfigDto)
], GenerateAllDataDto.prototype, "shifts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des jours fériés' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => HolidaysConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", HolidaysConfigDto)
], GenerateAllDataDto.prototype, "holidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des plannings' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SchedulesConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", SchedulesConfigDto)
], GenerateAllDataDto.prototype, "schedules", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des congés' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LeavesConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", LeavesConfigDto)
], GenerateAllDataDto.prototype, "leaves", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des pointages' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AttendanceConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", AttendanceConfigDto)
], GenerateAllDataDto.prototype, "attendance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des heures supplémentaires (direct)' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OvertimeConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", OvertimeConfigDto)
], GenerateAllDataDto.prototype, "overtime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration de la récupération' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RecoveryConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", RecoveryConfigDto)
], GenerateAllDataDto.prototype, "recovery", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des devices' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DevicesConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", DevicesConfigDto)
], GenerateAllDataDto.prototype, "devices", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des remplacements' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ReplacementsConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ReplacementsConfigDto)
], GenerateAllDataDto.prototype, "replacements", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Configuration des notifications' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => NotificationsConfigDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", NotificationsConfigDto)
], GenerateAllDataDto.prototype, "notifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Options globales' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GlobalOptionsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", GlobalOptionsDto)
], GenerateAllDataDto.prototype, "options", void 0);
//# sourceMappingURL=generate-all-data.dto.js.map