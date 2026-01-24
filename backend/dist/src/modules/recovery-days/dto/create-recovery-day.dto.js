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
exports.ConvertFlexibleDto = exports.UpdateRecoveryDayDto = exports.ApproveRecoveryDayDto = exports.ConvertOvertimeToRecoveryDayDto = exports.CreateRecoveryDayDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateRecoveryDayDto {
}
exports.CreateRecoveryDayDto = CreateRecoveryDayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'employé' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRecoveryDayDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de début de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRecoveryDayDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de fin de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRecoveryDayDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre de jours de récupération' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.5),
    __metadata("design:type", Number)
], CreateRecoveryDayDto.prototype, "days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Heures supplémentaires utilisées pour cette récupération' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRecoveryDayDto.prototype, "sourceHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Taux de conversion utilisé (si différent du défaut)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRecoveryDayDto.prototype, "conversionRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRecoveryDayDto.prototype, "notes", void 0);
class ConvertOvertimeToRecoveryDayDto {
}
exports.ConvertOvertimeToRecoveryDayDto = ConvertOvertimeToRecoveryDayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'employé' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertOvertimeToRecoveryDayDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre de jours de récupération à créer' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.5),
    __metadata("design:type", Number)
], ConvertOvertimeToRecoveryDayDto.prototype, "days", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de début de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConvertOvertimeToRecoveryDayDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de fin de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConvertOvertimeToRecoveryDayDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertOvertimeToRecoveryDayDto.prototype, "notes", void 0);
class ApproveRecoveryDayDto {
}
exports.ApproveRecoveryDayDto = ApproveRecoveryDayDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Commentaire d\'approbation' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveRecoveryDayDto.prototype, "comment", void 0);
class UpdateRecoveryDayDto {
}
exports.UpdateRecoveryDayDto = UpdateRecoveryDayDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de début' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRecoveryDayDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Date de fin' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRecoveryDayDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nombre de jours' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.5),
    __metadata("design:type", Number)
], UpdateRecoveryDayDto.prototype, "days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRecoveryDayDto.prototype, "notes", void 0);
class ConvertFlexibleDto {
}
exports.ConvertFlexibleDto = ConvertFlexibleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'employé' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertFlexibleDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Liste des IDs des heures supplémentaires à convertir',
        type: [String],
        example: ['overtime-id-1', 'overtime-id-2']
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Au moins une heure supplémentaire doit être sélectionnée' }),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ConvertFlexibleDto.prototype, "overtimeIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de début de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConvertFlexibleDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de fin de la récupération (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConvertFlexibleDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nombre de jours de récupération à créer',
        minimum: 0.5
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.5),
    __metadata("design:type", Number)
], ConvertFlexibleDto.prototype, "days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Approuver automatiquement si le manager a l\'autorité directe',
        default: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConvertFlexibleDto.prototype, "autoApprove", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Permettre les dates passées pour régularisation',
        default: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConvertFlexibleDto.prototype, "allowPastDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes ou commentaires' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConvertFlexibleDto.prototype, "notes", void 0);
//# sourceMappingURL=create-recovery-day.dto.js.map