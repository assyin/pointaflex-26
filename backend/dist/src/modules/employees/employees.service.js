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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const XLSX = require("xlsx");
let EmployeesService = class EmployeesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, createEmployeeDto) {
        const existing = await this.prisma.employee.findUnique({
            where: {
                tenantId_matricule: {
                    tenantId,
                    matricule: createEmployeeDto.matricule,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Employee with matricule ${createEmployeeDto.matricule} already exists`);
        }
        return this.prisma.employee.create({
            data: {
                ...createEmployeeDto,
                tenantId,
                hireDate: new Date(createEmployeeDto.hireDate),
                dateOfBirth: createEmployeeDto.dateOfBirth ? new Date(createEmployeeDto.dateOfBirth) : undefined,
            },
            include: {
                site: true,
                department: true,
                team: true,
                currentShift: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
        if (filters?.siteId)
            where.siteId = filters.siteId;
        if (filters?.departmentId)
            where.departmentId = filters.departmentId;
        if (filters?.teamId)
            where.teamId = filters.teamId;
        if (filters?.isActive !== undefined)
            where.isActive = filters.isActive;
        if (filters?.search) {
            where.OR = [
                { matricule: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.employee.findMany({
            where,
            include: {
                site: true,
                department: true,
                team: true,
                currentShift: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(tenantId, id) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
            include: {
                site: true,
                department: true,
                team: true,
                currentShift: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
                attendance: {
                    take: 10,
                    orderBy: { timestamp: 'desc' },
                },
                leaves: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        leaveType: true,
                    },
                },
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }
    async update(tenantId, id, updateEmployeeDto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return this.prisma.employee.update({
            where: { id },
            data: {
                ...updateEmployeeDto,
                hireDate: updateEmployeeDto.hireDate ? new Date(updateEmployeeDto.hireDate) : undefined,
                dateOfBirth: updateEmployeeDto.dateOfBirth ? new Date(updateEmployeeDto.dateOfBirth) : undefined,
            },
            include: {
                site: true,
                department: true,
                team: true,
                currentShift: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
    }
    async remove(tenantId, id) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return this.prisma.employee.delete({
            where: { id },
        });
    }
    async updateBiometricData(tenantId, id, biometricData) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, tenantId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return this.prisma.employee.update({
            where: { id },
            data: biometricData,
            select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true,
                fingerprintData: true,
                faceData: true,
                rfidBadge: true,
                qrCode: true,
                pinCode: true,
            },
        });
    }
    async deleteAll(tenantId) {
        const count = await this.prisma.employee.count({
            where: { tenantId },
        });
        await this.prisma.employee.deleteMany({
            where: { tenantId },
        });
        return {
            statusCode: 200,
            message: `Successfully deleted ${count} employees`,
            data: { count },
        };
    }
    async getStats(tenantId) {
        const [total, active, inactive, bySite, byDepartment, byShift] = await Promise.all([
            this.prisma.employee.count({ where: { tenantId } }),
            this.prisma.employee.count({ where: { tenantId, isActive: true } }),
            this.prisma.employee.count({ where: { tenantId, isActive: false } }),
            this.prisma.employee.groupBy({
                by: ['siteId'],
                where: { tenantId, siteId: { not: null } },
                _count: true,
            }),
            this.prisma.employee.groupBy({
                by: ['departmentId'],
                where: { tenantId, departmentId: { not: null } },
                _count: true,
            }),
            this.prisma.employee.groupBy({
                by: ['currentShiftId'],
                where: { tenantId, currentShiftId: { not: null } },
                _count: true,
            }),
        ]);
        return {
            total,
            active,
            inactive,
            bySite,
            byDepartment,
            byShift,
        };
    }
    async importFromExcel(tenantId, fileBuffer) {
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            imported: [],
        };
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const dataRows = rows.slice(1);
            console.log(`📊 Import started: ${dataRows.length} employees to process`);
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = i + 2;
                try {
                    if (!row || row.length === 0 || !row[0]) {
                        continue;
                    }
                    const matricule = String(row[0] || '').trim();
                    const civilite = String(row[1] || '').trim();
                    const lastName = String(row[2] || '').trim();
                    const firstName = String(row[3] || '').trim();
                    const situationFamiliale = String(row[4] || '').trim();
                    const nbEnfants = row[5] ? parseInt(String(row[5])) : 0;
                    const dateNaissance = this.parseExcelDate(row[6]);
                    const cnss = String(row[7] || '').trim();
                    const cin = String(row[8] || '').trim();
                    const address = String(row[9] || '').trim();
                    const city = String(row[10] || '').trim();
                    const agence = String(row[11] || '').trim();
                    const rib = String(row[12] || '').trim();
                    const contrat = String(row[13] || '').trim();
                    const hireDate = this.parseExcelDate(row[14]);
                    const department = String(row[15] || '').trim();
                    const region = String(row[16] || '').trim();
                    const category = String(row[17] || '').trim();
                    const position = String(row[18] || '').trim();
                    const phone = String(row[19] || '').trim();
                    if (!matricule || !firstName || !lastName) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: 'Missing required fields (Matricule, First Name, or Last Name)',
                        });
                        result.failed++;
                        continue;
                    }
                    const email = `${matricule.toLowerCase().replace(/\s/g, '')}@company.local`;
                    let departmentId;
                    if (department) {
                        let dept = await this.prisma.department.findFirst({
                            where: {
                                tenantId,
                                name: department,
                            },
                        });
                        if (!dept) {
                            dept = await this.prisma.department.create({
                                data: {
                                    tenantId,
                                    name: department,
                                },
                            });
                            console.log(`📁 Created department: ${department}`);
                        }
                        departmentId = dept.id;
                    }
                    const existing = await this.prisma.employee.findUnique({
                        where: {
                            tenantId_matricule: {
                                tenantId,
                                matricule,
                            },
                        },
                    });
                    if (existing) {
                        await this.prisma.employee.update({
                            where: { id: existing.id },
                            data: {
                                firstName,
                                lastName,
                                email,
                                phone: phone || undefined,
                                position: position || undefined,
                                hireDate: hireDate ? new Date(hireDate) : undefined,
                                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                                address: address || undefined,
                                contractType: contrat || undefined,
                                departmentId: departmentId || undefined,
                                civilite: civilite || undefined,
                                situationFamiliale: situationFamiliale || undefined,
                                nombreEnfants: nbEnfants || undefined,
                                cnss: cnss || undefined,
                                cin: cin || undefined,
                                ville: city || undefined,
                                rib: rib || undefined,
                                region: region || undefined,
                                categorie: category || undefined,
                                isActive: true,
                            },
                        });
                        result.imported.push({ matricule, firstName, lastName });
                        result.success++;
                    }
                    else {
                        await this.prisma.employee.create({
                            data: {
                                tenantId,
                                matricule,
                                firstName,
                                lastName,
                                email,
                                phone: phone || undefined,
                                position: position || undefined,
                                hireDate: hireDate ? new Date(hireDate) : new Date(),
                                dateOfBirth: dateNaissance ? new Date(dateNaissance) : undefined,
                                address: address || undefined,
                                contractType: contrat || undefined,
                                departmentId: departmentId || undefined,
                                civilite: civilite || undefined,
                                situationFamiliale: situationFamiliale || undefined,
                                nombreEnfants: nbEnfants || undefined,
                                cnss: cnss || undefined,
                                cin: cin || undefined,
                                ville: city || undefined,
                                rib: rib || undefined,
                                region: region || undefined,
                                categorie: category || undefined,
                                isActive: true,
                            },
                        });
                        result.imported.push({ matricule, firstName, lastName });
                        result.success++;
                    }
                }
                catch (error) {
                    result.errors.push({
                        row: rowNumber,
                        matricule: row[0] ? String(row[0]).trim() : undefined,
                        error: error.message || 'Unknown error',
                    });
                    result.failed++;
                }
            }
            console.log(`✅ Import completed: ${result.success} success, ${result.failed} failed`);
            return result;
        }
        catch (error) {
            throw new Error(`Excel import failed: ${error.message}`);
        }
    }
    async exportToExcel(tenantId) {
        const employees = await this.prisma.employee.findMany({
            where: { tenantId },
            orderBy: { matricule: 'asc' },
            include: {
                site: true,
                department: true,
                team: true,
            },
        });
        const excelData = [
            [
                'Matricule',
                'Civilité',
                'Nom',
                'Prénom',
                'Situation Familiale',
                'Nb Enf',
                'Date de Naissance',
                'N° CNSS',
                'N° CIN',
                'Adresse',
                'Ville',
                "Nom d'agence",
                'RIB',
                'Contrat',
                "Date d'Embauche",
                'Département',
                'Région',
                'Catégorie',
                'Fonction',
                'N° téléphone',
            ],
        ];
        employees.forEach((emp) => {
            excelData.push([
                emp.matricule,
                emp.civilite || '',
                emp.lastName,
                emp.firstName,
                emp.situationFamiliale || '',
                emp.nombreEnfants?.toString() || '',
                emp.dateOfBirth ? this.formatDate(emp.dateOfBirth) : '',
                emp.cnss || '',
                emp.cin || '',
                emp.address || '',
                emp.ville || '',
                emp.site?.name || '',
                emp.rib || '',
                emp.contractType || '',
                emp.hireDate ? this.formatDate(emp.hireDate) : '',
                emp.department?.name || '',
                emp.region || '',
                emp.categorie || '',
                emp.position || '',
                emp.phone || '',
            ]);
        });
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Employés');
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 8 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 8 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 },
            { wch: 25 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 20 },
            { wch: 12 },
        ];
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    }
    parseExcelDate(value) {
        if (!value)
            return null;
        try {
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            if (typeof value === 'string') {
                const parts = value.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            }
            if (typeof value === 'number') {
                const date = XLSX.SSF.parse_date_code(value);
                if (date) {
                    const year = date.y;
                    const month = String(date.m).padStart(2, '0');
                    const day = String(date.d).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            return null;
        }
        catch (error) {
            console.warn(`Failed to parse date: ${value}`, error);
            return null;
        }
    }
    async bulkAssignToSite(tenantId, siteId, employeeIds) {
        const site = await this.prisma.site.findFirst({
            where: { id: siteId, tenantId },
        });
        if (!site) {
            throw new common_1.NotFoundException(`Site with ID ${siteId} not found`);
        }
        const where = { tenantId };
        if (employeeIds && employeeIds.length > 0) {
            where.id = { in: employeeIds };
        }
        const result = await this.prisma.employee.updateMany({
            where,
            data: {
                siteId,
            },
        });
        return {
            success: true,
            message: `${result.count} employé(s) assigné(s) au site ${site.name}`,
            count: result.count,
            site: {
                id: site.id,
                name: site.name,
                code: site.code,
            },
        };
    }
    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map