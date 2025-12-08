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
exports.ImportScheduleResultDto = exports.ImportScheduleRowDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ImportScheduleRowDto {
}
exports.ImportScheduleRowDto = ImportScheduleRowDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'EMP001', description: 'Matricule de l\'employé' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "matricule", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-15', description: 'Date de début (YYYY-MM-DD)' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "dateDebut", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-31', required: false, description: 'Date de fin pour créer un intervalle (YYYY-MM-DD). Si vide, crée un planning pour une seule journée.' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "dateFin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'M', description: 'Code du shift (ex: M pour Matin, S pour Soir, N pour Nuit)' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "shiftCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '08:00', required: false, description: 'Heure de début personnalisée (HH:mm)' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "customStartTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '16:00', required: false, description: 'Heure de fin personnalisée (HH:mm)' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "customEndTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TEAM001', required: false, description: 'Code de l\'équipe' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "teamCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Travail à distance', required: false, description: 'Notes' }),
    __metadata("design:type", String)
], ImportScheduleRowDto.prototype, "notes", void 0);
class ImportScheduleResultDto {
}
exports.ImportScheduleResultDto = ImportScheduleResultDto;
//# sourceMappingURL=import-schedule.dto.js.map