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
exports.GenerateLeavesDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GenerateLeavesDto {
}
exports.GenerateLeavesDto = GenerateLeavesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Pourcentage d\'employés ayant des congés (0-100)',
        example: 30,
        default: 30,
        minimum: 0,
        maximum: 100
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateLeavesDto.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre moyen de jours de congé par employé',
        example: 5,
        default: 5,
        minimum: 1,
        maximum: 30
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(30),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateLeavesDto.prototype, "averageDaysPerEmployee", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'IDs des types de congés à utiliser (si vide, tous les types)',
        type: [String]
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], GenerateLeavesDto.prototype, "leaveTypeIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Date de début de la période de génération',
        example: '2025-01-01'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateLeavesDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Date de fin de la période de génération',
        example: '2025-12-31'
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateLeavesDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Approuver automatiquement les congés générés (status APPROVED)',
        default: true
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateLeavesDto.prototype, "autoApprove", void 0);
//# sourceMappingURL=generate-leaves.dto.js.map