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
exports.CreateSupplementaryDayDto = exports.SupplementaryDayType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var SupplementaryDayType;
(function (SupplementaryDayType) {
    SupplementaryDayType["WEEKEND_SATURDAY"] = "WEEKEND_SATURDAY";
    SupplementaryDayType["WEEKEND_SUNDAY"] = "WEEKEND_SUNDAY";
    SupplementaryDayType["HOLIDAY"] = "HOLIDAY";
})(SupplementaryDayType || (exports.SupplementaryDayType = SupplementaryDayType = {}));
class CreateSupplementaryDayDto {
}
exports.CreateSupplementaryDayDto = CreateSupplementaryDayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'employé' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date du jour supplémentaire' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nombre d\'heures travaillées' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSupplementaryDayDto.prototype, "hours", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: SupplementaryDayType, description: 'Type de jour supplémentaire' }),
    (0, class_validator_1.IsEnum)(SupplementaryDayType),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Heure d\'entrée' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "checkIn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Heure de sortie' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "checkOut", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Source de détection' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplementaryDayDto.prototype, "notes", void 0);
//# sourceMappingURL=create-supplementary-day.dto.js.map