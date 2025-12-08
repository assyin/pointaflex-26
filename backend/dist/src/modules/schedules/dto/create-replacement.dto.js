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
exports.UpdateReplacementDto = exports.CreateReplacementDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateReplacementDto {
}
exports.CreateReplacementDto = CreateReplacementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of replacement (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReplacementDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original employee ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReplacementDto.prototype, "originalEmployeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Replacement employee ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReplacementDto.prototype, "replacementEmployeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Shift ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReplacementDto.prototype, "shiftId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reason for replacement' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReplacementDto.prototype, "reason", void 0);
class UpdateReplacementDto {
}
exports.UpdateReplacementDto = UpdateReplacementDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ReplacementStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ReplacementStatus),
    __metadata("design:type", String)
], UpdateReplacementDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Approver user ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateReplacementDto.prototype, "approvedBy", void 0);
//# sourceMappingURL=create-replacement.dto.js.map