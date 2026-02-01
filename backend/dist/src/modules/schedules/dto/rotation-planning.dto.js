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
exports.PreviewRotationResultDto = exports.PreviewRotationPlanningDto = exports.RotationPlanningResultDto = exports.GenerateRotationPlanningDto = exports.EmployeeRotationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class EmployeeRotationDto {
}
exports.EmployeeRotationDto = EmployeeRotationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Employee ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], EmployeeRotationDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-01', description: 'Date de début de travail pour cet employé (premier jour de travail du cycle)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EmployeeRotationDto.prototype, "startDate", void 0);
class GenerateRotationPlanningDto {
}
exports.GenerateRotationPlanningDto = GenerateRotationPlanningDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4, description: 'Nombre de jours de travail consécutifs' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], GenerateRotationPlanningDto.prototype, "workDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2, description: 'Nombre de jours de repos consécutifs' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], GenerateRotationPlanningDto.prototype, "restDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Shift ID à utiliser pour les jours de travail' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateRotationPlanningDto.prototype, "shiftId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-31', description: 'Date de fin de génération' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateRotationPlanningDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [EmployeeRotationDto], description: 'Liste des employés avec leur date de début' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EmployeeRotationDto),
    __metadata("design:type", Array)
], GenerateRotationPlanningDto.prototype, "employees", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'Écraser les plannings existants' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GenerateRotationPlanningDto.prototype, "overwriteExisting", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true, description: 'Respecter les congés approuvés (ne pas créer de planning sur les jours de congé)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GenerateRotationPlanningDto.prototype, "respectLeaves", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true, description: 'Respecter les jours de récupération approuvés' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GenerateRotationPlanningDto.prototype, "respectRecoveryDays", void 0);
class RotationPlanningResultDto {
}
exports.RotationPlanningResultDto = RotationPlanningResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre de plannings créés avec succès' }),
    __metadata("design:type", Number)
], RotationPlanningResultDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre de plannings ignorés (déjà existants)' }),
    __metadata("design:type", Number)
], RotationPlanningResultDto.prototype, "skipped", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre d\'erreurs' }),
    __metadata("design:type", Number)
], RotationPlanningResultDto.prototype, "failed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Détails des plannings créés par employé' }),
    __metadata("design:type", Array)
], RotationPlanningResultDto.prototype, "details", void 0);
class PreviewRotationPlanningDto {
}
exports.PreviewRotationPlanningDto = PreviewRotationPlanningDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4, description: 'Nombre de jours de travail consécutifs' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], PreviewRotationPlanningDto.prototype, "workDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2, description: 'Nombre de jours de repos consécutifs' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], PreviewRotationPlanningDto.prototype, "restDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-31', description: 'Date de fin de génération' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PreviewRotationPlanningDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [EmployeeRotationDto], description: 'Liste des employés avec leur date de début' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EmployeeRotationDto),
    __metadata("design:type", Array)
], PreviewRotationPlanningDto.prototype, "employees", void 0);
class PreviewRotationResultDto {
}
exports.PreviewRotationResultDto = PreviewRotationResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Aperçu du planning par employé' }),
    __metadata("design:type", Array)
], PreviewRotationResultDto.prototype, "preview", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre total de plannings qui seront créés' }),
    __metadata("design:type", Number)
], PreviewRotationResultDto.prototype, "totalSchedulesToCreate", void 0);
//# sourceMappingURL=rotation-planning.dto.js.map