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
exports.WebhookStateResponseDto = exports.WebhookStateDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class WebhookStateDto {
}
exports.WebhookStateDto = WebhookStateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Matricule de l\'employé (depuis le terminal)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WebhookStateDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp du pointage ISO8601' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], WebhookStateDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type de pointage - FOURNI PAR LE TERMINAL, NE PAS MODIFIER',
        enum: ['IN', 'OUT']
    }),
    (0, class_validator_1.IsEnum)(client_1.AttendanceType),
    __metadata("design:type", String)
], WebhookStateDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'State brut du terminal ZKTeco (0-5)',
        minimum: 0,
        maximum: 255
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(255),
    __metadata("design:type", Number)
], WebhookStateDto.prototype, "terminalState", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Méthode d\'authentification',
        enum: client_1.DeviceType,
        default: 'FINGERPRINT'
    }),
    (0, class_validator_1.IsEnum)(client_1.DeviceType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WebhookStateDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Source du pointage',
        default: 'TERMINAL'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WebhookStateDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Données brutes du terminal pour audit' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WebhookStateDto.prototype, "rawData", void 0);
class WebhookStateResponseDto {
}
exports.WebhookStateResponseDto = WebhookStateResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Statut de traitement' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID du pointage créé' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Type enregistré (IN/OUT)' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Anomalie détectée' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "anomaly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID existant si doublon' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "existingId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Message d\'erreur' }),
    __metadata("design:type", String)
], WebhookStateResponseDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Durée de traitement en ms' }),
    __metadata("design:type", Number)
], WebhookStateResponseDto.prototype, "duration", void 0);
//# sourceMappingURL=webhook-state.dto.js.map