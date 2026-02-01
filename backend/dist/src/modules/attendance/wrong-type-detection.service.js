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
exports.WrongTypeDetectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let WrongTypeDetectionService = class WrongTypeDetectionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async detect(tenantId, employeeId, timestamp, actualType, departmentId) {
        const config = await this.getEffectiveConfig(tenantId, departmentId);
        if (!config.enabled) {
            return { isWrongType: false, confidence: 0, expectedType: null, actualType, reason: 'Détection désactivée', detectionMethod: 'NONE' };
        }
        const method = config.detectionMethod;
        if (method === 'SHIFT_BASED' || method === 'COMBINED') {
            const shiftResult = await this.detectByShift(tenantId, employeeId, timestamp, actualType, config.marginMinutes);
            if (shiftResult.isWrongType && shiftResult.confidence >= config.confidenceThreshold) {
                return shiftResult;
            }
            if (method === 'SHIFT_BASED') {
                return shiftResult;
            }
        }
        if (method === 'CONTEXT_BASED' || method === 'COMBINED') {
            const contextResult = await this.detectByContext(tenantId, employeeId, timestamp, actualType);
            if (contextResult.isWrongType && contextResult.confidence >= config.confidenceThreshold) {
                return contextResult;
            }
            if (method === 'CONTEXT_BASED') {
                return contextResult;
            }
        }
        return { isWrongType: false, confidence: 0, expectedType: null, actualType, reason: 'Aucune anomalie de type détectée', detectionMethod: method };
    }
    async detectByShift(tenantId, employeeId, timestamp, actualType, marginMinutes) {
        const dateStr = timestamp.toISOString().split('T')[0];
        const dayOfWeek = timestamp.getDay();
        const schedule = await this.prisma.schedule.findFirst({
            where: {
                tenantId,
                employeeId,
                date: new Date(dateStr),
            },
            include: { shift: true },
        });
        let shift = schedule?.shift;
        if (!shift) {
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, tenantId },
                include: { currentShift: true },
            });
            shift = employee?.currentShift;
        }
        if (!shift) {
            return {
                isWrongType: false,
                confidence: 0,
                expectedType: null,
                actualType,
                reason: 'Aucun shift trouvé pour cet employé',
                detectionMethod: 'SHIFT_BASED',
            };
        }
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const punchMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
        const shiftStartMinutes = startH * 60 + startM;
        const shiftEndMinutes = endH * 60 + endM;
        const isNightShift = shiftEndMinutes < shiftStartMinutes;
        let distanceToStart;
        let distanceToEnd;
        if (isNightShift) {
            const normalizedPunch = punchMinutes < shiftStartMinutes ? punchMinutes + 1440 : punchMinutes;
            const normalizedEnd = shiftEndMinutes + 1440;
            distanceToStart = Math.abs(normalizedPunch - shiftStartMinutes);
            distanceToEnd = Math.abs(normalizedPunch - normalizedEnd);
        }
        else {
            distanceToStart = Math.abs(punchMinutes - shiftStartMinutes);
            distanceToEnd = Math.abs(punchMinutes - shiftEndMinutes);
        }
        let expectedType = null;
        let confidence = 0;
        if (distanceToStart <= marginMinutes && distanceToEnd > marginMinutes) {
            expectedType = 'IN';
            confidence = Math.round(100 - (distanceToStart / marginMinutes) * 40);
        }
        else if (distanceToEnd <= marginMinutes && distanceToStart > marginMinutes) {
            expectedType = 'OUT';
            confidence = Math.round(100 - (distanceToEnd / marginMinutes) * 40);
        }
        else if (distanceToStart <= marginMinutes && distanceToEnd <= marginMinutes) {
            expectedType = distanceToStart < distanceToEnd ? 'IN' : 'OUT';
            confidence = 50;
        }
        if (expectedType && expectedType !== actualType) {
            return {
                isWrongType: true,
                confidence: Math.min(confidence, 100),
                expectedType,
                actualType,
                reason: `Pointage ${actualType} proche de ${expectedType === 'IN' ? 'début' : 'fin'} du shift (${shift.startTime}-${shift.endTime}). Distance: ${expectedType === 'IN' ? distanceToStart : distanceToEnd} min`,
                detectionMethod: 'SHIFT_BASED',
            };
        }
        return {
            isWrongType: false,
            confidence: 0,
            expectedType: null,
            actualType,
            reason: 'Type cohérent avec le shift',
            detectionMethod: 'SHIFT_BASED',
        };
    }
    async detectByContext(tenantId, employeeId, timestamp, actualType) {
        const lastPunch = await this.prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId,
                timestamp: { lt: timestamp },
                OR: [
                    { anomalyType: null },
                    { anomalyType: { notIn: ['DEBOUNCE_BLOCKED', 'PROBABLE_WRONG_TYPE'] } },
                ],
            },
            orderBy: { timestamp: 'desc' },
        });
        if (!lastPunch) {
            if (actualType === 'OUT') {
                return {
                    isWrongType: true,
                    confidence: 70,
                    expectedType: 'IN',
                    actualType,
                    reason: 'Premier pointage de la journée enregistré comme OUT (attendu: IN)',
                    detectionMethod: 'CONTEXT_BASED',
                };
            }
            return {
                isWrongType: false,
                confidence: 0,
                expectedType: null,
                actualType,
                reason: 'Premier pointage IN cohérent',
                detectionMethod: 'CONTEXT_BASED',
            };
        }
        const hoursSinceLastPunch = (timestamp.getTime() - lastPunch.timestamp.getTime()) / (1000 * 60 * 60);
        if (lastPunch.type === actualType && hoursSinceLastPunch < 14) {
            const expectedType = actualType === 'IN' ? 'OUT' : 'IN';
            const confidence = hoursSinceLastPunch < 12 ? 85 : 65;
            return {
                isWrongType: true,
                confidence,
                expectedType,
                actualType,
                reason: `Deux ${actualType} consécutifs détectés (dernier: ${lastPunch.timestamp.toLocaleTimeString('fr-FR')}, il y a ${hoursSinceLastPunch.toFixed(1)}h). Attendu: ${expectedType}`,
                detectionMethod: 'CONTEXT_BASED',
            };
        }
        return {
            isWrongType: false,
            confidence: 0,
            expectedType: null,
            actualType,
            reason: 'Séquence de types cohérente',
            detectionMethod: 'CONTEXT_BASED',
        };
    }
    async getEffectiveConfig(tenantId, departmentId) {
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                enableWrongTypeDetection: true,
                wrongTypeAutoCorrect: true,
                wrongTypeDetectionMethod: true,
                wrongTypeShiftMarginMinutes: true,
                wrongTypeConfidenceThreshold: true,
                wrongTypeRequiresValidation: true,
            },
        });
        const baseConfig = {
            enabled: tenantSettings?.enableWrongTypeDetection ?? false,
            autoCorrect: tenantSettings?.wrongTypeAutoCorrect ?? false,
            detectionMethod: tenantSettings?.wrongTypeDetectionMethod ?? 'SHIFT_BASED',
            marginMinutes: tenantSettings?.wrongTypeShiftMarginMinutes ?? 120,
            confidenceThreshold: tenantSettings?.wrongTypeConfidenceThreshold ?? 80,
            requiresValidation: tenantSettings?.wrongTypeRequiresValidation ?? true,
        };
        if (departmentId) {
            const deptSettings = await this.prisma.departmentSettings.findUnique({
                where: { departmentId },
                select: {
                    wrongTypeDetectionEnabled: true,
                    wrongTypeAutoCorrect: true,
                    wrongTypeShiftMarginMinutes: true,
                },
            });
            if (deptSettings) {
                if (deptSettings.wrongTypeDetectionEnabled !== null) {
                    baseConfig.enabled = deptSettings.wrongTypeDetectionEnabled;
                }
                if (deptSettings.wrongTypeAutoCorrect !== null) {
                    baseConfig.autoCorrect = deptSettings.wrongTypeAutoCorrect;
                }
                if (deptSettings.wrongTypeShiftMarginMinutes !== null) {
                    baseConfig.marginMinutes = deptSettings.wrongTypeShiftMarginMinutes;
                }
            }
        }
        return baseConfig;
    }
};
exports.WrongTypeDetectionService = WrongTypeDetectionService;
exports.WrongTypeDetectionService = WrongTypeDetectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WrongTypeDetectionService);
//# sourceMappingURL=wrong-type-detection.service.js.map