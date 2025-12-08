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
exports.GenerateSingleAttendanceDto = exports.ScenarioType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ScenarioType;
(function (ScenarioType) {
    ScenarioType["NORMAL"] = "normal";
    ScenarioType["LATE"] = "late";
    ScenarioType["EARLY_LEAVE"] = "earlyLeave";
    ScenarioType["ANOMALY"] = "anomaly";
    ScenarioType["MISSION"] = "mission";
    ScenarioType["ABSENCE"] = "absence";
    ScenarioType["DOUBLE_IN"] = "doubleIn";
    ScenarioType["MISSING_OUT"] = "missingOut";
    ScenarioType["LONG_BREAK"] = "longBreak";
})(ScenarioType || (exports.ScenarioType = ScenarioType = {}));
class GenerateSingleAttendanceDto {
}
exports.GenerateSingleAttendanceDto = GenerateSingleAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de l\'employé' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateSingleAttendanceDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date pour générer le pointage', example: '2025-01-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateSingleAttendanceDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type de scénario à générer',
        enum: ScenarioType,
        example: ScenarioType.NORMAL
    }),
    (0, class_validator_1.IsEnum)(ScenarioType),
    __metadata("design:type", String)
], GenerateSingleAttendanceDto.prototype, "scenario", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Site ID (optionnel)' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateSingleAttendanceDto.prototype, "siteId", void 0);
//# sourceMappingURL=generate-single-attendance.dto.js.map