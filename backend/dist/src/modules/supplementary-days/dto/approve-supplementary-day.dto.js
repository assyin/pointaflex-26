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
exports.ApproveSupplementaryDayDto = exports.ApprovalStatus = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
class ApproveSupplementaryDayDto {
}
exports.ApproveSupplementaryDayDto = ApproveSupplementaryDayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApprovalStatus, description: 'Statut d\'approbation' }),
    (0, class_validator_1.IsEnum)(ApprovalStatus),
    __metadata("design:type", String)
], ApproveSupplementaryDayDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Heures approuvées (peut différer des heures déclarées)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ApproveSupplementaryDayDto.prototype, "approvedHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Raison du rejet' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveSupplementaryDayDto.prototype, "rejectionReason", void 0);
//# sourceMappingURL=approve-supplementary-day.dto.js.map