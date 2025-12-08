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
exports.GenerateBulkAttendanceDto = exports.DistributionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class DistributionDto {
}
exports.DistributionDto = DistributionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage de journées normales', example: 70, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "normal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage de retards', example: 15, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "late", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage de départs anticipés', example: 5, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "earlyLeave", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage d\'anomalies', example: 5, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "anomaly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage de missions', example: 3, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "mission", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pourcentage d\'absences', example: 2, minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DistributionDto.prototype, "absence", void 0);
class GenerateBulkAttendanceDto {
}
exports.GenerateBulkAttendanceDto = GenerateBulkAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de début', example: '2025-01-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateBulkAttendanceDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date de fin', example: '2025-01-31' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateBulkAttendanceDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Liste des IDs d\'employés (si vide, tous les employés actifs)' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateBulkAttendanceDto.prototype, "employeeIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Distribution des scénarios' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DistributionDto),
    __metadata("design:type", DistributionDto)
], GenerateBulkAttendanceDto.prototype, "distribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Site ID (optionnel)' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateBulkAttendanceDto.prototype, "siteId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exclure les jours fériés de la génération',
        default: true
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateBulkAttendanceDto.prototype, "excludeHolidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exclure les weekends (samedi et dimanche) de la génération',
        default: true
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateBulkAttendanceDto.prototype, "excludeWeekends", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Générer automatiquement les heures supplémentaires',
        default: false
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateBulkAttendanceDto.prototype, "generateOvertime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil minimum en minutes pour créer une heure supplémentaire',
        default: 30,
        minimum: 0
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateBulkAttendanceDto.prototype, "overtimeThreshold", void 0);
//# sourceMappingURL=generate-bulk-attendance.dto.js.map