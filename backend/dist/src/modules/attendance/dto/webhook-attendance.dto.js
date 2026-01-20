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
exports.WebhookAttendanceDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class WebhookAttendanceDto {
}
exports.WebhookAttendanceDto = WebhookAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Matricule ou ID de l\'employé' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Type de pointage', enum: client_1.AttendanceType }),
    (0, class_validator_1.IsEnum)(client_1.AttendanceType),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Méthode utilisée', enum: client_1.DeviceType }),
    (0, class_validator_1.IsEnum)(client_1.DeviceType),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp du pointage', example: '2025-01-15T08:00:00Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Données brutes du terminal' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WebhookAttendanceDto.prototype, "rawData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Indique si le pointage est ambigu et nécessite validation' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], WebhookAttendanceDto.prototype, "isAmbiguous", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Statut de validation', enum: ['NONE', 'PENDING_VALIDATION'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "validationStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Raison de l\'ambiguïté' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WebhookAttendanceDto.prototype, "ambiguityReason", void 0);
//# sourceMappingURL=webhook-attendance.dto.js.map