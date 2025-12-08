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
exports.ZKTecoPushDto = exports.ZKTecoPushDataDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ZKTecoPushDataDto {
}
exports.ZKTecoPushDataDto = ZKTecoPushDataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User PIN/ID in terminal' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ZKTecoPushDataDto.prototype, "pin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp of attendance' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ZKTecoPushDataDto.prototype, "time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Attendance status (0=check-in, 1=check-out, etc.)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ZKTecoPushDataDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Verification method (0=password, 1=fingerprint, 4=face, etc.)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ZKTecoPushDataDto.prototype, "verify", void 0);
class ZKTecoPushDto {
}
exports.ZKTecoPushDto = ZKTecoPushDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Terminal serial number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ZKTecoPushDto.prototype, "sn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Table name (usually "attendance")' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ZKTecoPushDto.prototype, "table", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp of the event' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ZKTecoPushDto.prototype, "stamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Attendance data' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", ZKTecoPushDataDto)
], ZKTecoPushDto.prototype, "data", void 0);
//# sourceMappingURL=zkteco-push.dto.js.map