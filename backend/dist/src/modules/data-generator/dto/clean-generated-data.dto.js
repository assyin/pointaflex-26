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
exports.CleanGeneratedDataDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CleanGeneratedDataDto {
}
exports.CleanGeneratedDataDto = CleanGeneratedDataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Supprimer toutes les données générées', default: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CleanGeneratedDataDto.prototype, "deleteAll", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Supprimer uniquement les données après cette date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CleanGeneratedDataDto.prototype, "afterDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Supprimer uniquement pour cet employé' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CleanGeneratedDataDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Supprimer uniquement pour ce site' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CleanGeneratedDataDto.prototype, "siteId", void 0);
//# sourceMappingURL=clean-generated-data.dto.js.map