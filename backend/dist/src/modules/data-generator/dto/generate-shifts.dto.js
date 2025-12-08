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
exports.GenerateShiftsDto = exports.ShiftDistributionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ShiftDistributionDto {
}
exports.ShiftDistributionDto = ShiftDistributionDto;
class GenerateShiftsDto {
}
exports.GenerateShiftsDto = GenerateShiftsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Créer des shifts par défaut (Matin, Soir, Nuit) s\'ils n\'existent pas',
        default: true
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateShiftsDto.prototype, "createDefaultShifts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Distribution d\'assignation des shifts aux employés (ex: { "shiftId1": 50, "shiftId2": 30, "shiftId3": 20 })',
        example: { "shift-id-1": 50, "shift-id-2": 30, "shift-id-3": 20 }
    }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ShiftDistributionDto)
], GenerateShiftsDto.prototype, "distribution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Créer des plannings (Schedule) pour une période donnée',
        default: false
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateShiftsDto.prototype, "createSchedules", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Date de début pour la génération de plannings',
        example: '2025-01-01'
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateShiftsDto.prototype, "scheduleStartDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Date de fin pour la génération de plannings',
        example: '2025-01-31'
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateShiftsDto.prototype, "scheduleEndDate", void 0);
//# sourceMappingURL=generate-shifts.dto.js.map