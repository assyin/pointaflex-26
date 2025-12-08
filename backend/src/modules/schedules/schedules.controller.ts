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
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { AlertsService } from './alerts.service';
import { CreateScheduleDto, BulkScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateReplacementDto } from './dto/create-replacement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Schedules')
@Controller('schedules')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class SchedulesController {
  constructor(
    private schedulesService: SchedulesService,
    private alertsService: AlertsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create new schedule' })
  create(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    // Log pour debug
    console.log('Received schedule creation request:', JSON.stringify(dto, null, 2));
    return this.schedulesService.create(user.tenantId, dto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create multiple schedules' })
  createBulk(@CurrentUser() user: any, @Body() dto: BulkScheduleDto) {
    return this.schedulesService.createBulk(user.tenantId, dto.schedules);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('teamId') teamId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulesService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        employeeId,
        teamId,
        shiftId,
        siteId,
        startDate,
        endDate,
      },
    );
  }

  @Get('week/:date')
  @ApiOperation({ summary: 'Get week schedule' })
  getWeek(
    @CurrentUser() user: any,
    @Param('date') date: string,
    @Query('teamId') teamId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.schedulesService.getWeekSchedule(user.tenantId, date, {
      teamId,
      siteId,
    });
  }

  @Get('month/:date')
  @ApiOperation({ summary: 'Get month schedule' })
  getMonth(
    @CurrentUser() user: any,
    @Param('date') date: string,
    @Query('teamId') teamId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.schedulesService.getMonthSchedule(user.tenantId, date, {
      teamId,
      siteId,
    });
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get legal alerts for date range' })
  getAlerts(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.alertsService.generateAlerts(
      user.tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Replacements endpoints
  @Post('replacements')
  @Roles(Role.ADMIN_RH, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Create replacement request' })
  createReplacement(
    @CurrentUser() user: any,
    @Body() dto: CreateReplacementDto,
  ) {
    return this.schedulesService.createReplacement(user.tenantId, dto);
  }

  @Get('replacements')
  @ApiOperation({ summary: 'Get all replacements' })
  findAllReplacements(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulesService.findAllReplacements(user.tenantId, {
      status,
      startDate,
      endDate,
    });
  }

  @Patch('replacements/:id/approve')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Approve replacement' })
  approveReplacement(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.schedulesService.approveReplacement(
      user.tenantId,
      id,
      user.id,
    );
  }

  @Patch('replacements/:id/reject')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Reject replacement' })
  rejectReplacement(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.schedulesService.rejectReplacement(
      user.tenantId,
      id,
      user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Update schedule' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Delete schedule' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulesService.remove(user.tenantId, id);
  }

  @Delete('bulk')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Delete multiple schedules' })
  removeBulk(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.schedulesService.removeBulk(user.tenantId, body.ids);
  }

  @Post('import/excel')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import schedules from Excel file' })
  async importExcel(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Aucun fichier téléchargé',
      };
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Format de fichier invalide. Seuls les fichiers .xlsx et .xls sont acceptés.',
      };
    }

    const result = await this.schedulesService.importFromExcel(user.tenantId, file.buffer);

    return {
      statusCode: HttpStatus.OK,
      message: `Import terminé: ${result.success} planning(s) importé(s), ${result.failed} échec(s)`,
      data: result,
    };
  }

  @Get('import/template')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Download Excel template for schedule import' })
  async downloadTemplate(@Res() res: Response) {
    const XLSX = require('xlsx');

    // Create template data with French date format (DD/MM/YYYY)
    const templateData = [
      ['Matricule', 'Date Début', 'Date Fin', 'Code Shift', 'Heure Début', 'Heure Fin', 'Code Équipe', 'Notes'],
      ['EMP001', '15/01/2025', '', 'M', '08:00', '16:00', 'TEAM001', 'Une journée'],
      ['EMP002', '15/01/2025', '31/01/2025', 'S', '14:00', '22:00', '', 'Intervalle de dates'],
      ['EMP001', '01/02/2025', '28/02/2025', 'M', '', '', 'TEAM001', 'Tout le mois'],
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Matricule
      { wch: 12 }, // Date Début
      { wch: 12 }, // Date Fin
      { wch: 12 }, // Code Shift
      { wch: 12 }, // Heure Début
      { wch: 12 }, // Heure Fin
      { wch: 12 }, // Code Équipe
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plannings');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `modele_import_plannings_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
