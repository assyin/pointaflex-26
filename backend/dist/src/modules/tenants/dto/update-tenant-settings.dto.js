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
exports.UpdateTenantSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateTenantSettingsDto {
}
exports.UpdateTenantSettingsDto = UpdateTenantSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "legalName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "hrEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "firstDayOfWeek", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [Number], description: 'Array of working days (1=Monday, 2=Tuesday, ..., 7=Sunday)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], UpdateTenantSettingsDto.prototype, "workingDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre de jours travaillés par semaine',
        example: 6,
        default: 6,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "workDaysPerWeek", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre d\'heures maximales hebdomadaires',
        example: 44,
        default: 44,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "maxWeeklyHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Durée de pause en minutes',
        example: 60,
        default: 60,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "breakDuration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tolérance de retard à l\'entrée en minutes',
        example: 10,
        default: 10,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "lateToleranceEntry", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tolérance de sortie anticipée en minutes',
        example: 5,
        default: 5,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "earlyToleranceExit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Arrondi des heures supplémentaires en minutes',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRounding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil minimum en minutes pour créer automatiquement un Overtime',
        example: 30,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeMinimumThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux de majoration pour les heures supplémentaires (DEPRECATED - utiliser overtimeRateStandard)',
        example: 1.25,
        default: 1.25,
        deprecated: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux de majoration pour le shift de nuit (DEPRECATED - utiliser overtimeRateNight)',
        example: 1.50,
        default: 1.50,
        deprecated: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "nightShiftRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer/désactiver les majorations (si false, tous les taux = 1.0)',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "overtimeMajorationEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux heures supp standard (1.0 = pas de majoration, 1.25 = +25%)',
        example: 1.25,
        default: 1.25,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRateStandard", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux heures de nuit (1.5 = +50%)',
        example: 1.50,
        default: 1.50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRateNight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux jours fériés (2.0 = +100%)',
        example: 2.00,
        default: 2.00,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRateHoliday", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux urgence/astreinte (1.3 = +30%)',
        example: 1.30,
        default: 1.30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeRateEmergency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Détecter automatiquement le type (NIGHT si shift nuit, HOLIDAY si férié)',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "overtimeAutoDetectType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure d\'envoi quotidienne des notifications heures sup en attente (format HH:mm)',
        example: '09:00',
        default: '09:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "overtimePendingNotificationTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer l\'auto-approbation des heures supplémentaires',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "overtimeAutoApprove", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil maximum d\'heures pour l\'auto-approbation (au-delà, approbation manuelle requise)',
        example: 4.0,
        default: 4.0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "overtimeAutoApproveMaxHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure de début du shift de nuit (format HH:mm)',
        example: '21:00',
        default: '21:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "nightShiftStart", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure de fin du shift de nuit (format HH:mm)',
        example: '06:00',
        default: '06:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "nightShiftEnd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer l\'alerte de dépassement des heures hebdomadaires',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "alertWeeklyHoursExceeded", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer l\'alerte de repos insuffisant',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "alertInsufficientRest", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer l\'alerte de travail de nuit répétitif',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "alertNightWorkRepetitive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer l\'alerte d\'effectif minimum',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "alertMinimumStaffing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre de jours de congé annuel',
        example: 18,
        default: 18,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "annualLeaveDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre de niveaux d\'approbation pour les congés',
        example: 2,
        default: 2,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "leaveApprovalLevels", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Inclure le samedi dans le calcul des jours de congé (même si samedi n\'est pas un jour ouvrable)',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "leaveIncludeSaturday", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer le workflow à deux niveaux pour les congés',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "twoLevelWorkflow", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Autoriser les demandes de congé anticipées',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "anticipatedLeave", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "monthlyPayrollEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "sfptExport", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "requireBreakPunch", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exiger un planning ou shift par défaut pour créer un pointage. Si false, les pointages sans planning/shift seront autorisés mais marqués comme anomalie.',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "requireScheduleForAttendance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heures de retard pour considérer absence partielle',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "absencePartialThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure d\'exécution du job de détection d\'absences (format HH:mm)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "absenceDetectionTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer/désactiver la détection de repos insuffisant',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "enableInsufficientRestDetection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre d\'heures légales de repos minimum requis entre deux shifts (défaut: 11h)',
        default: 11,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "minimumRestHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre d\'heures légales de repos minimum pour shift de nuit (optionnel, défaut: 12h)',
        default: 12,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "minimumRestHoursNightShift", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre de jours avant expiration du matricule temporaire (délai pour obtenir le matricule officiel)',
        example: 8,
        default: 8,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "temporaryMatriculeExpiryDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux de conversion heures supplémentaires -> récupération (1.0 = 1h supp = 1h récup)',
        example: 1.0,
        default: 1.0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "recoveryConversionRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre de jours avant expiration de la récupération',
        example: 90,
        default: 90,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "recoveryExpiryDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre d\'heures équivalent à une journée normale de travail (par défaut: 44h/6j = 7.33h)',
        example: 7.33,
        default: 7.33,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "dailyWorkingHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la majoration des heures travaillées les jours fériés',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "holidayOvertimeEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Taux de majoration pour les heures travaillées les jours fériés (défaut: 2.0 = double)',
        example: 2.0,
        default: 2.0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "holidayOvertimeRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Calculer les heures travaillées les jours fériés comme heures normales sans majoration',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "holidayOvertimeAsNormalHours", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fenêtre de détection MISSING_IN en minutes après début du shift (défaut: 30 min)',
        example: 30,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingInDetectionWindowMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fréquence du job de notification MISSING_IN en minutes (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingInNotificationFrequencyMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fenêtre de détection MISSING_OUT en minutes après fin du shift (défaut: 120 min)',
        example: 120,
        default: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutDetectionWindowMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fréquence du job de notification MISSING_OUT en minutes (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutNotificationFrequencyMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fréquence du job de notification LATE en minutes (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "lateNotificationFrequencyMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil de retard en minutes pour déclencher une notification (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "lateNotificationThresholdMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fréquence du job de notification ABSENCE en minutes (défaut: 60 min)',
        example: 60,
        default: 60,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "absenceNotificationFrequencyMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Délai tampon avant de considérer une absence en minutes (défaut: 60 min)',
        example: 60,
        default: 60,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "absenceDetectionBufferMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fréquence du job de notification ABSENCE_PARTIAL en minutes (défaut: 30 min)',
        example: 30,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "absencePartialNotificationFrequencyMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fenêtre de détection DOUBLE_IN en heures (défaut: 24h)',
        example: 24,
        default: 24,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "doubleInDetectionWindow", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil en heures pour considérer un IN comme orphelin (défaut: 12h)',
        example: 12,
        default: 12,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "orphanInThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fenêtre de tolérance en minutes pour erreur de badgeage (défaut: 2 min)',
        example: 2,
        default: 2,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "doublePunchToleranceMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la tolérance des pauses implicites (OUT suivi de IN dans délai raisonnable)',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "allowImplicitBreaks", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Durée minimum en minutes pour considérer une pause implicite (défaut: 30 min)',
        example: 30,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "minImplicitBreakMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Durée maximum en minutes pour considérer une pause implicite (défaut: 120 min)',
        example: 120,
        default: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "maxImplicitBreakMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la clôture automatique des sessions IN sans OUT (badge oublié)',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "autoCloseOrphanSessions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure de clôture par défaut si pas de shift défini (format HH:mm)',
        example: '23:59',
        default: '23:59',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "autoCloseDefaultTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Buffer en minutes à ajouter après fin de shift pour heures sup (0 = désactivé)',
        example: 120,
        default: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "autoCloseOvertimeBuffer", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Vérifier si overtime approuvé existe avant clôture (ajuste l\'heure de sortie)',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "autoCloseCheckApprovedOvertime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la détection de patterns suspects DOUBLE_IN',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "enableDoubleInPatternDetection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil d\'alerte pour patterns suspects (nombre de DOUBLE_IN sur 30 jours, défaut: 3)',
        example: 3,
        default: 3,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "doubleInPatternAlertThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Autoriser MISSING_IN pour télétravail',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "allowMissingInForRemoteWork", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Autoriser MISSING_IN pour missions',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "allowMissingInForMissions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer les rappels MISSING_IN',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "missingInReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Délai en minutes avant le rappel MISSING_IN (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingInReminderDelay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nombre maximum de rappels MISSING_IN par jour (défaut: 2)',
        example: 2,
        default: 2,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingInReminderMaxPerDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la détection de patterns d\'oubli MISSING_IN',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "enableMissingInPatternDetection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil d\'alerte pour patterns d\'oubli MISSING_IN (nombre sur 30 jours, défaut: 3)',
        example: 3,
        default: 3,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingInPatternAlertThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Heure d\'exécution du job batch MISSING_OUT (format HH:mm, défaut: 00:00)',
        example: '00:00',
        default: '00:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "missingOutDetectionTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fenêtre de détection en heures pour shifts de nuit (défaut: 12h)',
        example: 12,
        default: 12,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutDetectionWindow", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Autoriser MISSING_OUT pour télétravail',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "allowMissingOutForRemoteWork", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Autoriser MISSING_OUT pour missions',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "allowMissingOutForMissions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer les rappels MISSING_OUT',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "missingOutReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Délai en minutes avant le rappel MISSING_OUT (défaut: 15 min)',
        example: 15,
        default: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutReminderDelay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Rappel X minutes avant fermeture du shift (défaut: 30 min)',
        example: 30,
        default: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutReminderBeforeClosing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la détection de patterns d\'oubli MISSING_OUT',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "enableMissingOutPatternDetection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil d\'alerte pour patterns d\'oubli MISSING_OUT (nombre sur 30 jours, défaut: 3)',
        example: 3,
        default: 3,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "missingOutPatternAlertThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Activer la détection des erreurs de type IN/OUT (employé appuie sur IN au lieu de OUT)',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "enableWrongTypeDetection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Corriger automatiquement le type quand la confiance est suffisante',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "wrongTypeAutoCorrect", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Méthode de détection: SHIFT_BASED, CONTEXT_BASED, PATTERN_BASED, COMBINED',
        example: 'SHIFT_BASED',
        default: 'SHIFT_BASED',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "wrongTypeDetectionMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Marge en minutes autour du shift pour la détection (défaut: 120 min)',
        example: 120,
        default: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "wrongTypeShiftMarginMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Seuil de confiance minimum (0-100) pour signaler une erreur de type',
        example: 80,
        default: 80,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "wrongTypeConfidenceThreshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Exiger une validation manuelle même en auto-correction',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "wrongTypeRequiresValidation", void 0);
//# sourceMappingURL=update-tenant-settings.dto.js.map