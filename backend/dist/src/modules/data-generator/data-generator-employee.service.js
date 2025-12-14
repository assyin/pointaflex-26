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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataGeneratorEmployeeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorEmployeeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
let DataGeneratorEmployeeService = DataGeneratorEmployeeService_1 = class DataGeneratorEmployeeService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorEmployeeService_1.name);
    }
    async generateEmployees(tenantId, config) {
        this.logger.log(`👷 Génération de ${config.count || 0} employés pour tenant ${tenantId}`);
        const count = config.count || 10;
        const linkToUsers = config.linkToUsers !== false;
        const assignToStructures = config.assignToStructures !== false;
        const sites = await this.prisma.site.findMany({ where: { tenantId } });
        const departments = await this.prisma.department.findMany({ where: { tenantId } });
        const positions = await this.prisma.position.findMany({ where: { tenantId } });
        const teams = await this.prisma.team.findMany({ where: { tenantId } });
        const users = linkToUsers
            ? await this.prisma.user.findMany({
                where: { tenantId },
                include: {
                    userTenantRoles: { include: { role: true } },
                    employee: true,
                },
            })
            : [];
        if (assignToStructures && (sites.length === 0 || departments.length === 0 || positions.length === 0)) {
            this.logger.warn('⚠️ Sites, départements ou positions manquants. Les employés seront créés sans assignation.');
        }
        const lastEmployee = await this.prisma.employee.findFirst({
            where: { tenantId },
            orderBy: { matricule: 'desc' },
            select: { matricule: true },
        });
        let employeeIndex = 1;
        if (lastEmployee && lastEmployee.matricule) {
            const match = lastEmployee.matricule.match(/\d+$/);
            if (match) {
                employeeIndex = parseInt(match[0], 10) + 1;
            }
        }
        this.logger.log(`📝 Démarrage avec matricule EMP${String(employeeIndex).padStart(4, '0')}`);
        let created = 0;
        const assignedUserIds = new Set();
        for (let i = 0; i < count; i++) {
            const firstName = this.generateFirstName();
            const lastName = this.generateLastName();
            const matricule = `EMP${String(employeeIndex).padStart(4, '0')}`;
            const email = config.dataOptions?.generateEmails !== false
                ? `${matricule.toLowerCase()}@company.local`
                : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@company.local`;
            const siteId = assignToStructures && sites.length > 0
                ? this.selectRandom(sites).id
                : undefined;
            const departmentId = assignToStructures && departments.length > 0
                ? this.selectRandom(departments).id
                : undefined;
            const positionId = assignToStructures && positions.length > 0
                ? this.selectRandom(positions).id
                : undefined;
            const teamId = assignToStructures && teams.length > 0
                ? this.selectRandom(teams).id
                : undefined;
            let userId;
            if (linkToUsers && users.length > 0) {
                const availableUsers = users.filter((u) => !u.employee && !assignedUserIds.has(u.id));
                if (availableUsers.length > 0) {
                    const selectedUser = this.selectRandom(availableUsers);
                    userId = selectedUser.id;
                    assignedUserIds.add(userId);
                }
            }
            const phone = config.dataOptions?.generatePhones !== false
                ? this.generatePhone()
                : undefined;
            const address = config.dataOptions?.generateAddresses !== false
                ? this.generateAddress()
                : undefined;
            const hireDate = this.generateHireDate();
            await this.prisma.employee.create({
                data: {
                    tenantId,
                    matricule,
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    hireDate,
                    siteId,
                    departmentId,
                    positionId,
                    teamId,
                    userId,
                    isActive: true,
                    position: positions.find((p) => p.id === positionId)?.name || undefined,
                },
            });
            created++;
            employeeIndex++;
            this.orchestrator.incrementEntityCount('Employee');
        }
        this.logger.log(`✅ ${created} employés créés`);
        return created;
    }
    selectRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    generateFirstName() {
        const firstNames = [
            'Ahmed', 'Mohamed', 'Fatima', 'Aicha', 'Hassan', 'Said', 'Khadija', 'Laila',
            'Youssef', 'Omar', 'Zineb', 'Nadia', 'Karim', 'Samir', 'Salma', 'Sanae',
            'Mehdi', 'Bilal', 'Imane', 'Souad', 'Rachid', 'Nabil', 'Najat', 'Latifa',
            'Jean', 'Pierre', 'Marie', 'Sophie', 'Paul', 'Luc', 'Julie', 'Anne',
        ];
        return firstNames[Math.floor(Math.random() * firstNames.length)];
    }
    generateLastName() {
        const lastNames = [
            'Alaoui', 'Benali', 'Cherkaoui', 'El Amrani', 'Fassi', 'Idrissi', 'Lamrani', 'Mansouri',
            'Naciri', 'Ouali', 'Rahmani', 'Saadi', 'Tazi', 'Zahiri', 'Bennani', 'Chraibi',
            'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
        ];
        return lastNames[Math.floor(Math.random() * lastNames.length)];
    }
    generatePhone() {
        const prefixes = ['06', '07'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = String(Math.floor(Math.random() * 90000000) + 10000000);
        return `${prefix}${number}`;
    }
    generateAddress() {
        const streets = [
            'Rue Mohammed V',
            'Avenue Hassan II',
            'Boulevard Zerktouni',
            'Rue Allal Ben Abdellah',
            'Avenue des FAR',
            'Rue de la Résistance',
            'Boulevard Mohammed VI',
        ];
        const numbers = Math.floor(Math.random() * 200) + 1;
        return `${numbers} ${streets[Math.floor(Math.random() * streets.length)]}`;
    }
    generateHireDate() {
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
        const randomTime = fiveYearsAgo.getTime() + Math.random() * (now.getTime() - fiveYearsAgo.getTime());
        return new Date(randomTime);
    }
};
exports.DataGeneratorEmployeeService = DataGeneratorEmployeeService;
exports.DataGeneratorEmployeeService = DataGeneratorEmployeeService = DataGeneratorEmployeeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorEmployeeService);
//# sourceMappingURL=data-generator-employee.service.js.map