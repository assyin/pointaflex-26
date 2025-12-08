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
exports.BiometricDataDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class BiometricDataDto {
}
exports.BiometricDataDto = BiometricDataDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Données d\'empreinte digitale (hash)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BiometricDataDto.prototype, "fingerprintData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Données de reconnaissance faciale (hash)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BiometricDataDto.prototype, "faceData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Badge RFID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BiometricDataDto.prototype, "rfidBadge", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'QR Code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BiometricDataDto.prototype, "qrCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Code PIN' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BiometricDataDto.prototype, "pinCode", void 0);
//# sourceMappingURL=biometric-data.dto.js.map