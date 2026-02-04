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
import { GenerateRotationPlanningDto, PreviewRotationPlanningDto } from './dto/rotation-planning.dto';
import { ExtendScheduleDto } from './dto/extend-schedule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LegacyRole } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';


@ApiTags('Schedules')
@Controller('schedules')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
export class SchedulesController {
  constructor(
    private schedulesService: SchedulesService,
    private alertsService: AlertsService,
  ) {}

  @Post()
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Create new schedule' })
  create(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    // Log pour debug
    console.log('Received schedule creation request:', JSON.stringify(dto, null, 2));
    return this.schedulesService.create(user.tenantId, dto);
  }

  @Post('bulk')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Create multiple schedules' })
  createBulk(@CurrentUser() user: any, @Body() dto: BulkScheduleDto) {
    return this.schedulesService.createBulk(user.tenantId, dto.schedules);
  }

  @Get()
  @RequirePermissions('schedule.view_all', 'schedule.view_own', 'schedule.view_team')
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
      user.userId,
      user.permissions || [],
    );
  }

  @Get('week/:date')
  @RequirePermissions('schedule.view_all', 'schedule.view_own', 'schedule.view_team')
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
  @RequirePermissions('schedule.view_all', 'schedule.view_own', 'schedule.view_team')
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
  @RequirePermissions('schedule.view_all')
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
  @RequirePermissions('schedule.create', 'schedule.request_replacement')
  @ApiOperation({ summary: 'Create replacement request' })
  createReplacement(
    @CurrentUser() user: any,
    @Body() dto: CreateReplacementDto,
  ) {
    return this.schedulesService.createReplacement(user.tenantId, dto);
  }

  @Get('replacements')
  @RequirePermissions('schedule.view_all', 'schedule.view_own')
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
  @RequirePermissions('schedule.approve')
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
  @RequirePermissions('schedule.approve')
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
  @RequirePermissions('schedule.update')
  @ApiOperation({ summary: 'Update schedule' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(user.tenantId, id, dto);
  }

  @Delete('bulk')
  @RequirePermissions('schedule.delete')
  @ApiOperation({ summary: 'Delete multiple schedules' })
  removeBulk(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.schedulesService.removeBulk(user.tenantId, body.ids);
  }

  @Delete(':id')
  @RequirePermissions('schedule.delete')
  @ApiOperation({ summary: 'Delete schedule' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulesService.remove(user.tenantId, id);
  }

  @Post('import/excel')
  @RequirePermissions('schedule.create', 'schedule.import')
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
  @RequirePermissions('schedule.create')
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

  @Post('import/weekly-calendar')
  @RequirePermissions('schedule.create', 'schedule.import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import schedules from Weekly Calendar Excel format' })
  async importWeeklyCalendar(
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

    const result = await this.schedulesService.importFromWeeklyCalendar(user.tenantId, file.buffer);

    return {
      statusCode: HttpStatus.OK,
      message: `Import terminé: ${result.success} planning(s) importé(s), ${result.failed} échec(s)`,
      data: result,
    };
  }

  @Get('import/weekly-calendar/template')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Download Weekly Calendar Excel template with employees and shift codes' })
  async downloadWeeklyCalendarTemplate(
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const buffer = await this.schedulesService.generateWeeklyCalendarTemplate(user.tenantId);

    const filename = `planning_calendrier_hebdomadaire_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  // ============== ROTATION PLANNING ENDPOINTS ==============

  @Post('rotation/preview')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Preview rotation planning before generation' })
  async previewRotationPlanning(
    @CurrentUser() user: any,
    @Body() dto: PreviewRotationPlanningDto,
  ) {
    return this.schedulesService.previewRotationPlanning(user.tenantId, dto);
  }

  @Post('rotation/generate')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Generate rotation planning (X days work / Y days rest)' })
  async generateRotationPlanning(
    @CurrentUser() user: any,
    @Body() dto: GenerateRotationPlanningDto,
  ) {
    const result = await this.schedulesService.generateRotationPlanning(user.tenantId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: `Génération terminée: ${result.success} planning(s) créé(s), ${result.skipped} ignoré(s), ${result.failed} erreur(s)`,
      data: result,
    };
  }

  // ============== EXTEND/PROLONG SCHEDULE ENDPOINTS ==============

  @Post('extend/preview')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Preview de la prolongation des plannings rotatifs (détection automatique du pattern)' })
  async previewExtendSchedules(
    @CurrentUser() user: any,
    @Body() dto: ExtendScheduleDto,
  ) {
    return this.schedulesService.previewExtendSchedules(user.tenantId, dto);
  }

  @Post('extend')
  @RequirePermissions('schedule.create')
  @ApiOperation({ summary: 'Prolonger les plannings rotatifs (détection automatique du pattern)' })
  async extendSchedules(
    @CurrentUser() user: any,
    @Body() dto: ExtendScheduleDto,
  ) {
    const result = await this.schedulesService.extendSchedules(user.tenantId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: `Prolongation terminée: ${result.success} planning(s) créé(s), ${result.skipped} ignoré(s), ${result.failed} erreur(s)`,
      data: result,
    };
  }

  @Get('extend/detect-pattern/:employeeId')
  @RequirePermissions('schedule.view_all')
  @ApiOperation({ summary: 'Détecter le pattern de rotation d\'un employé' })
  async detectPattern(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
  ) {
    const pattern = await this.schedulesService.detectEmployeePattern(user.tenantId, employeeId);
    return {
      detected: !!pattern,
      pattern,
    };
  }
}