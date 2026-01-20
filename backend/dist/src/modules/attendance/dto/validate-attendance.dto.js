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
exports.BulkValidateAttendanceDto = exports.ValidateAttendanceDto = exports.ValidationAction = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ValidationAction;
(function (ValidationAction) {
    ValidationAction["VALIDATE"] = "VALIDATE";
    ValidationAction["REJECT"] = "REJECT";
    ValidationAction["CORRECT"] = "CORRECT";
})(ValidationAction || (exports.ValidationAction = ValidationAction = {}));
class ValidateAttendanceDto {
}
exports.ValidateAttendanceDto = ValidateAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID du pointage à valider' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "attendanceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Action de validation', enum: ValidationAction }),
    (0, class_validator_1.IsEnum)(ValidationAction),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Type corrigé (IN/OUT) si action=CORRECT' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "correctedType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Note de validation' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "validationNote", void 0);
class BulkValidateAttendanceDto {
}
exports.BulkValidateAttendanceDto = BulkValidateAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Liste des validations', type: [ValidateAttendanceDto] }),
    __metadata("design:type", Array)
], BulkValidateAttendanceDto.prototype, "validations", void 0);
//# sourceMappingURL=validate-attendance.dto.js.map