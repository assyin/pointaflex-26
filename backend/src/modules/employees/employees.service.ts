import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { BiometricDataDto } from './dto/biometric-data.dto';
import { ImportEmployeeDto, ImportResultDto } from './dto/import-excel.dto';
import { BulkAssignSiteDto } from './dto/bulk-assign-site.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createEmployeeDto: CreateEmployeeDto) {
    // Vérifier si le matricule existe déjà
    const existing = await this.prisma.employee.findUnique({
      where: {
        tenantId_matricule: {
          tenantId,
          matricule: createEmployeeDto.matricule,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Employee with matricule ${createEmployeeDto.matricule} already exists`);
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

  async findAll(tenantId: string, filters?: {
    siteId?: string;
    departmentId?: string;
    teamId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = { tenantId };

    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

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

  async findOne(tenantId: string, id: string) {
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
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(tenantId: string, id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
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

  async remove(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.prisma.employee.delete({
      where: { id },
    });
  }

  async updateBiometricData(tenantId: string, id: string, biometricData: BiometricDataDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
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

  /**
   * Delete all employees for a tenant
   */
  async deleteAll(tenantId: string) {
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

  async getStats(tenantId: string) {
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

  /**
   * Import employees from Excel file buffer
   */
  async importFromExcel(tenantId: string, fileBuffer: Buffer): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      success: 0,
      failed: 0,
      errors: [],
      imported: [],
    };

    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1);

      console.log(`📊 Import started: ${dataRows.length} employees to process`);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header and 0-index

        try {
          // Skip empty rows
          if (!row || row.length === 0 || !row[0]) {
            continue;
          }

          // Parse row data (based on Excel structure)
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

          // Validate required fields
          if (!matricule || !firstName || !lastName) {
            result.errors.push({
              row: rowNumber,
              matricule,
              error: 'Missing required fields (Matricule, First Name, or Last Name)',
            });
            result.failed++;
            continue;
          }

          // Generate email from matricule
          const email = `${matricule.toLowerCase().replace(/\s/g, '')}@company.local`;

          // Handle department - create if doesn't exist
          let departmentId: string | undefined;
          if (department) {
            let dept = await this.prisma.department.findFirst({
              where: {
                tenantId,
                name: department,
              },
            });

            if (!dept) {
              // Create department automatically
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

          // Check if employee already exists
          const existing = await this.prisma.employee.findUnique({
            where: {
              tenantId_matricule: {
                tenantId,
                matricule,
              },
            },
          });

          if (existing) {
            // Update existing employee
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
                // New fields from Excel
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
          } else {
            // Create new employee
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
                // New fields from Excel
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
        } catch (error) {
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
    } catch (error) {
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }

  /**
   * Export employees to Excel file buffer
   */
  async exportToExcel(tenantId: string): Promise<Buffer> {
    // Get all employees
    const employees = await this.prisma.employee.findMany({
      where: { tenantId },
      orderBy: { matricule: 'asc' },
      include: {
        site: true,
        department: true,
        team: true,
      },
    });

    // Prepare data for Excel
    const excelData = [
      // Header row
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

    // Data rows
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

    // Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employés');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Matricule
      { wch: 8 },  // Civilité
      { wch: 15 }, // Nom
      { wch: 15 }, // Prénom
      { wch: 18 }, // Situation Familiale
      { wch: 8 },  // Nb Enf
      { wch: 12 }, // Date de Naissance
      { wch: 15 }, // CNSS
      { wch: 10 }, // CIN
      { wch: 30 }, // Adresse
      { wch: 15 }, // Ville
      { wch: 20 }, // Nom d'agence
      { wch: 25 }, // RIB
      { wch: 10 }, // Contrat
      { wch: 12 }, // Date d'Embauche
      { wch: 15 }, // Département
      { wch: 15 }, // Région
      { wch: 12 }, // Catégorie
      { wch: 20 }, // Fonction
      { wch: 12 }, // Téléphone
    ];

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Parse Excel date (can be date object, string, or serial number)
   */
  private parseExcelDate(value: any): string | null {
    if (!value) return null;

    try {
      // If it's already a date object
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }

      // If it's a string in DD/MM/YYYY format
      if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // If it's an Excel serial number
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
    } catch (error) {
      console.warn(`Failed to parse date: ${value}`, error);
      return null;
    }
  }

  /**
   * Assigner des employés à un site en masse
   */
  async bulkAssignToSite(tenantId: string, siteId: string, employeeIds?: string[]) {
    // Vérifier que le site existe et appartient au tenant
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // Construire la condition where
    const where: any = { tenantId };
    
    // Si des IDs spécifiques sont fournis, filtrer par ces IDs
    if (employeeIds && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    // Mettre à jour tous les employés correspondants
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

  /**
   * Format date to DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
