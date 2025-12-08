import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { BiometricDataDto } from './dto/biometric-data.dto';
import { BulkAssignSiteDto } from './dto/bulk-assign-site.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '@prisma/client';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 409, description: 'Employee with this matricule already exists' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(tenantId, createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees with filters' })
  @ApiResponse({ status: 200, description: 'List of employees' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll(tenantId, {
      siteId,
      departmentId,
      teamId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('stats')
  @Roles(Role.ADMIN_RH, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get employee statistics' })
  @ApiResponse({ status: 200, description: 'Employee statistics' })
  getStats(@CurrentTenant() tenantId: string) {
    return this.employeesService.getStats(tenantId);
  }

  @Get('export/excel')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export all employees to Excel file' })
  @ApiResponse({ status: 200, description: 'Excel file generated' })
  async exportExcel(
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.employeesService.exportToExcel(tenantId);

    const filename = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.employeesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenantId, id, updateEmployeeDto);
  }

  @Delete('all')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete all employees for tenant' })
  @ApiResponse({ status: 200, description: 'All employees deleted successfully' })
  removeAll(@CurrentTenant() tenantId: string) {
    return this.employeesService.deleteAll(tenantId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.employeesService.remove(tenantId, id);
  }

  @Post('import/excel')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import employees from Excel file' })
  @ApiResponse({ status: 200, description: 'Import completed with result summary' })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  async importExcel(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No file uploaded',
      };
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid file format. Only .xlsx and .xls files are allowed.',
      };
    }

    const result = await this.employeesService.importFromExcel(tenantId, file.buffer);

    return {
      statusCode: HttpStatus.OK,
      message: `Import completed: ${result.success} employees imported, ${result.failed} failed`,
      data: result,
    };
  }

  @Post(':id/biometric')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update employee biometric data' })
  @ApiResponse({ status: 200, description: 'Biometric data updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  updateBiometric(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() biometricData: BiometricDataDto,
  ) {
    return this.employeesService.updateBiometricData(tenantId, id, biometricData);
  }

  @Post('bulk-assign-site')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assigner des employés à un site en masse' })
  @ApiResponse({ status: 200, description: 'Employés assignés avec succès' })
  @ApiResponse({ status: 404, description: 'Site non trouvé' })
  bulkAssignToSite(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkAssignSiteDto,
  ) {
    return this.employeesService.bulkAssignToSite(tenantId, dto.siteId, dto.employeeIds);
  }
}
