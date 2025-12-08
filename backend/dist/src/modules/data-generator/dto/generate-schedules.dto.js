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
exports.GenerateSchedulesDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GenerateSchedulesDto {
}
exports.GenerateSchedulesDto = GenerateSchedulesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2025-01-01',
        description: 'Date de début pour la génération de plannings (YYYY-MM-DD)'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateSchedulesDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2025-01-31',
        description: 'Date de fin pour la génération de plannings (YYYY-MM-DD)'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateSchedulesDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'IDs des employés à inclure (optionnel, tous si vide)',
        type: [String]
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateSchedulesDto.prototype, "employeeIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'IDs des shifts à utiliser (optionnel, tous si vide)',
        type: [String]
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateSchedulesDto.prototype, "shiftIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exclure les weekends',
        default: true
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateSchedulesDto.prototype, "excludeWeekends", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exclure les jours fériés',
        default: true
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateSchedulesDto.prototype, "excludeHolidays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Pourcentage de jours travaillés par employé (0-100)',
        example: 80,
        default: 80
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateSchedulesDto.prototype, "workDaysPercentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Distribution des shifts (en pourcentage, doit totaliser 100)',
        example: { 'shift-id-1': 40, 'shift-id-2': 40, 'shift-id-3': 20 }
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateSchedulesDto.prototype, "shiftDistribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Créer des plannings pour tous les jours ou seulement les jours ouvrables',
        default: true
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateSchedulesDto.prototype, "onlyWorkdays", void 0);
//# sourceMappingURL=generate-schedules.dto.js.map