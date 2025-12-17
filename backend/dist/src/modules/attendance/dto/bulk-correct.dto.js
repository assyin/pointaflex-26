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
exports.BulkCorrectAttendanceDto = exports.BulkCorrectionItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class BulkCorrectionItemDto {
}
exports.BulkCorrectionItemDto = BulkCorrectionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID du pointage à corriger' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCorrectionItemDto.prototype, "attendanceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nouveau timestamp corrigé (optionnel)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCorrectionItemDto.prototype, "correctedTimestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Note de correction spécifique pour ce pointage' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCorrectionItemDto.prototype, "correctionNote", void 0);
class BulkCorrectAttendanceDto {
}
exports.BulkCorrectAttendanceDto = BulkCorrectAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Liste des pointages à corriger', type: [BulkCorrectionItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkCorrectionItemDto),
    __metadata("design:type", Array)
], BulkCorrectAttendanceDto.prototype, "attendances", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Note de correction générale' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCorrectAttendanceDto.prototype, "generalNote", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'utilisateur qui corrige' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCorrectAttendanceDto.prototype, "correctedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Forcer la correction sans approbation (admin seulement)', required: false }),
    __metadata("design:type", Boolean)
], BulkCorrectAttendanceDto.prototype, "forceApproval", void 0);
//# sourceMappingURL=bulk-correct.dto.js.map