import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { WebhookAttendanceDto } from './dto/webhook-attendance.dto';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { AttendanceStatsQueryDto } from './dto/attendance-stats.dto';
import { BulkCorrectAttendanceDto } from './dto/bulk-correct.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { LegacyRole, AttendanceType, DeviceType } from '@prisma/client';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.create')
  @ApiOperation({ summary: 'Create manual attendance record' })
  @ApiResponse({ status: 201, description: 'Attendance created successfully' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() createAttendanceDto: CreateAttendanceDto,
  ) {
    return this.attendanceService.create(tenantId, createAttendanceDto);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook endpoint for biometric devices' })
  @ApiHeader({ name: 'X-Device-ID', required: true, description: 'Device unique ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' })
  @ApiHeader({ name: 'X-API-Key', required: false, description: 'Device API Key' })
  @ApiResponse({ status: 201, description: 'Attendance recorded from device' })
  @ApiResponse({ status: 401, description: 'Invalid device credentials' })
  async handleWebhook(
    @Headers('x-device-id') deviceId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-api-key') apiKey: string,
    @Body() webhookData: WebhookAttendanceDto,
  ) {
    if (!deviceId || !tenantId) {
      throw new UnauthorizedException('Missing device credentials');
    }

    // Passer l'API Key au service pour validation
    return this.attendanceService.handleWebhook(tenantId, deviceId, webhookData, apiKey);
  }

  @Post('webhook/fast')
  @Public()
  @ApiOperation({ summary: 'Fast webhook - returns immediately, processes in background' })
  @ApiHeader({ name: 'X-Device-ID', required: true, description: 'Device unique ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' })
  @ApiHeader({ name: 'X-API-Key', required: false, description: 'Device API Key' })
  @ApiResponse({ status: 201, description: 'Attendance queued for processing' })
  async handleWebhookFast(
    @Headers('x-device-id') deviceId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-api-key') apiKey: string,
    @Body() webhookData: WebhookAttendanceDto,
  ) {
    if (!deviceId || !tenantId) {
      throw new UnauthorizedException('Missing device credentials');
    }

    return this.attendanceService.handleWebhookFast(tenantId, deviceId, webhookData, apiKey);
  }

  @Get('count')
  @Public()
  @ApiOperation({ summary: 'Get punch count for an employee on a specific date (for IN/OUT detection)' })
  @ApiHeader({ name: 'X-Device-ID', required: true, description: 'Device unique ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' })
  @ApiHeader({ name: 'X-API-Key', required: false, description: 'Device API Key' })
  @ApiQuery({ name: 'employeeId', required: true, description: 'Employee ID or matricule' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'punchTime', required: false, description: 'Punch time ISO string (for night shift detection)' })
  @ApiResponse({ status: 200, description: 'Returns the punch count and optional forceType for night shifts' })
  async getPunchCount(
    @Headers('x-device-id') deviceId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-api-key') apiKey: string,
    @Query('employeeId') employeeId: string,
    @Query('date') date: string,
    @Query('punchTime') punchTime?: string,
  ) {
    if (!deviceId || !tenantId) {
      throw new UnauthorizedException('Missing device credentials');
    }

    return this.attendanceService.getPunchCountForDay(tenantId, employeeId, date, deviceId, apiKey, punchTime);
  }

  @Post('push')
  @Public()
  @ApiOperation({ summary: 'Push URL endpoint for ZKTeco native push (no auth required)' })
  @ApiResponse({ status: 201, description: 'Attendance recorded from terminal push' })
  @ApiResponse({ status: 400, description: 'Invalid data format' })
  async handlePushFromTerminal(
    @Body() body: any,
    @Headers() headers: any,
  ) {
    console.log('📥 [Push URL] Données reçues du terminal:', JSON.stringify(body, null, 2));
    console.log('📋 [Push URL] Headers:', headers);

    // Extraire le device ID depuis les données ou headers
    // Le terminal ZKTeco peut envoyer: SN, deviceId, sn, serialNumber
    // Pour format BioTime: le sn est souvent le serial number physique, pas le deviceId logique
    let deviceId = headers['device-id'] || headers['x-device-id'] || headers['deviceid'];

    // Si pas dans les headers, essayer dans le body
    if (!deviceId) {
      deviceId = body.SN || body.deviceId || body.serialNumber;

      // Pour format BioTime avec serial number dans sn, on essaie de trouver le device par SN
      if (!deviceId && body.sn) {
        // Le body.sn peut être le serial number du terminal, on va chercher le device par là
        // Pour l'instant, utiliser le sn comme deviceId
        deviceId = body.sn;
      }
    }

    // Fallback si vraiment rien trouvé
    if (!deviceId) {
      deviceId = 'Terminal_Caisse'; // Fallback par défaut
    }

    // Tenant ID peut venir des headers ou être hardcodé pour ce terminal
    const tenantId = headers['x-tenant-id'] || headers['tenant-id'] ||
                     '90fab0cc-8539-4566-8da7-8742e9b6937b';

    // Le terminal ZKTeco envoie généralement:
    // { "pin": "1091", "time": "2025-11-26 12:00:00", "state": 0/1, "verifymode": 1 }
    // Ou: { "cardno": "1091", "checktime": "2025-11-26 12:00:00", ... }
    // Ou format BioTime: { "sn": "xxx", "table": "attendance", "data": { "pin": "...", ... } }

    try {
      // Si c'est le format BioTime avec données imbriquées
      let attendanceData = body;
      if (body.table === 'attendance' && body.data) {
        attendanceData = body.data;
      }

      // Adapter le format du terminal vers notre format webhook
      const webhookData: WebhookAttendanceDto = {
        employeeId: attendanceData.pin || attendanceData.userId || attendanceData.cardno || attendanceData.userCode || attendanceData.user_id,
        timestamp: attendanceData.time || attendanceData.checktime || attendanceData.timestamp || new Date().toISOString(),
        type: this.mapAttendanceType(attendanceData.state || attendanceData.status || attendanceData.checktype || attendanceData.type),
        method: this.mapVerifyMode(attendanceData.verifymode || attendanceData.verify || attendanceData.verifyMode || attendanceData.verify_mode),
        rawData: body,
      };

      console.log('🔄 [Push URL] Données converties:', JSON.stringify(webhookData, null, 2));

      // Extraire l'API key depuis les headers (optionnel)
      const apiKey = headers['x-api-key'] || headers['api-key'] || headers['apikey'];

      // Utiliser le même service que le webhook (avec validation API key)
      const result = await this.attendanceService.handleWebhook(tenantId, deviceId, webhookData, apiKey);

      console.log('✅ [Push URL] Pointage enregistré avec succès');
      return result;

    } catch (error) {
      console.error('❌ [Push URL] Erreur:', error.message);
      console.error('📋 [Push URL] Body reçu:', body);
      throw error;
    }
  }

  /**
   * Map le type de pointage du terminal (state) vers notre enum
   * 0 = OUT, 1 = IN, 2 = OUT pour pause, 3 = IN après pause
   */
  private mapAttendanceType(state: any): AttendanceType {
    if (state === undefined || state === null) return AttendanceType.IN;

    const stateNum = typeof state === 'string' ? parseInt(state, 10) : state;

    // Convention ZKTeco standard
    if (stateNum === 0 || stateNum === 2) return AttendanceType.OUT;
    return AttendanceType.IN;
  }

  /**
   * Map le mode de vérification du terminal vers notre enum
   */
  private mapVerifyMode(mode: any): DeviceType {
    if (mode === undefined || mode === null) return DeviceType.MANUAL;

    const modeNum = typeof mode === 'string' ? parseInt(mode, 10) : mode;

    const map: Record<number, DeviceType> = {
      0: DeviceType.PIN_CODE,
      1: DeviceType.FINGERPRINT,
      3: DeviceType.FINGERPRINT,
      4: DeviceType.FACE_RECOGNITION,
      15: DeviceType.RFID_BADGE,
    };

    return map[modeNum] || DeviceType.MANUAL;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_own', 'attendance.view_team')
  @ApiOperation({ summary: 'Get all attendance records with filters' })
  @ApiResponse({ status: 200, description: 'List of attendance records' })
  findAll(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasAnomaly') hasAnomaly?: string,
    @Query('type') type?: AttendanceType,
  ) {
    // DEBUG: Log de la requête au contrôleur
    console.log('🔵 [AttendanceController.findAll] REQUÊTE REÇUE');
    console.log('🔵 [AttendanceController.findAll] tenantId:', tenantId);
    console.log('🔵 [AttendanceController.findAll] user:', JSON.stringify(user));
    console.log('🔵 [AttendanceController.findAll] startDate:', startDate, 'endDate:', endDate);

    return this.attendanceService.findAll(
      tenantId,
      {
        employeeId,
        siteId,
        startDate,
        endDate,
        hasAnomaly: hasAnomaly ? hasAnomaly === 'true' : undefined,
        type,
      },
      user.userId,
      user.permissions || [],
    );
  }

  @Get('anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team', 'attendance.view_department', 'attendance.view_site')
  @ApiOperation({ summary: 'Get attendance anomalies with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of anomalies' })
  getAnomalies(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('siteId') siteId?: string,
    @Query('anomalyType') anomalyType?: string,
    @Query('isCorrected') isCorrected?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string, // Backward compatibility
  ) {
    return this.attendanceService.getAnomaliesPaginated(
      tenantId,
      {
        startDate: startDate || date,
        endDate: endDate || date,
        employeeId,
        departmentId,
        siteId,
        anomalyType,
        isCorrected: isCorrected !== undefined ? isCorrected === 'true' : undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
      user.userId,
      user.permissions || [],
    );
  }

  @Get('daily-report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all')
  @ApiOperation({ summary: 'Get daily attendance report' })
  @ApiResponse({ status: 200, description: 'Daily report' })
  getDailyReport(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailyReport(tenantId, date);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiResponse({ status: 200, description: 'Attendance details' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.attendanceService.findOne(tenantId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.delete', 'attendance.edit')
  @ApiOperation({ summary: 'Delete manual attendance record' })
  @ApiResponse({ status: 200, description: 'Attendance deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  @ApiResponse({ status: 400, description: 'Only manual attendance records can be deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot delete attendance outside your scope' })
  delete(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.attendanceService.remove(
      tenantId,
      id,
      user.userId,
      user.permissions || [],
    );
  }

  @Patch(':id/correct')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.correct', 'attendance.edit')
  @ApiOperation({ summary: 'Correct attendance record' })
  @ApiResponse({ status: 200, description: 'Attendance corrected successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot correct attendance outside your scope' })
  correctAttendance(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() correctionDto: CorrectAttendanceDto,
  ) {
    return this.attendanceService.correctAttendance(
      tenantId,
      id,
      correctionDto,
      user.userId,
      user.permissions || [],
    );
  }

  @Patch(':id/approve-correction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.approve_correction', 'attendance.correct')
  @ApiOperation({ summary: 'Approve or reject attendance correction' })
  @ApiResponse({ status: 200, description: 'Correction approved/rejected successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  approveCorrection(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { approved: boolean; comment?: string },
  ) {
    return this.attendanceService.approveCorrection(
      tenantId,
      id,
      user.userId,
      body.approved,
      body.comment,
    );
  }

  @Get('stats/presence-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_own', 'attendance.view_team')
  @ApiOperation({ summary: 'Get presence rate for an employee' })
  @ApiResponse({ status: 200, description: 'Presence rate statistics' })
  getPresenceRate(
    @CurrentTenant() tenantId: string,
    @Query() query: AttendanceStatsQueryDto,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    
    if (!query.employeeId) {
      throw new Error('employeeId is required');
    }

    return this.attendanceService.getPresenceRate(
      tenantId,
      query.employeeId,
      startDate,
      endDate,
    );
  }

  @Get('stats/punctuality-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_own', 'attendance.view_team')
  @ApiOperation({ summary: 'Get punctuality rate for an employee' })
  @ApiResponse({ status: 200, description: 'Punctuality rate statistics' })
  getPunctualityRate(
    @CurrentTenant() tenantId: string,
    @Query() query: AttendanceStatsQueryDto,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    
    if (!query.employeeId) {
      throw new Error('employeeId is required');
    }

    return this.attendanceService.getPunctualityRate(
      tenantId,
      query.employeeId,
      startDate,
      endDate,
    );
  }

  @Get('stats/trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_own', 'attendance.view_team')
  @ApiOperation({ summary: 'Get attendance trends (graphs data)' })
  @ApiResponse({ status: 200, description: 'Trends data for charts' })
  getTrends(
    @CurrentTenant() tenantId: string,
    @Query() query: AttendanceStatsQueryDto,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    
    if (!query.employeeId) {
      throw new Error('employeeId is required');
    }

    return this.attendanceService.getTrends(
      tenantId,
      query.employeeId,
      startDate,
      endDate,
    );
  }

  @Get('stats/recurring-anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team')
  @ApiOperation({ summary: 'Detect recurring anomalies for an employee' })
  @ApiResponse({ status: 200, description: 'List of recurring anomalies' })
  getRecurringAnomalies(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('days') days?: string,
  ) {
    if (!employeeId) {
      throw new Error('employeeId is required');
    }

    return this.attendanceService.detectRecurringAnomalies(
      tenantId,
      employeeId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get(':id/correction-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_own')
  @ApiOperation({ summary: 'Get complete correction history for an attendance record' })
  @ApiResponse({ status: 200, description: 'Correction history' })
  getCorrectionHistory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.attendanceService.getCorrectionHistory(tenantId, id);
  }

  @Post('bulk-correct')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.correct', 'attendance.edit')
  @ApiOperation({ summary: 'Correct multiple attendance records at once' })
  @ApiResponse({ status: 200, description: 'Bulk correction results' })
  bulkCorrectAttendance(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Body() bulkDto: BulkCorrectAttendanceDto,
  ) {
    return this.attendanceService.bulkCorrectAttendance(tenantId, {
      ...bulkDto,
      correctedBy: user.userId,
    });
  }

  @Get('export/anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.export', 'attendance.view_all', 'attendance.view_anomalies')
  @ApiOperation({ summary: 'Export anomalies only (CSV/Excel)' })
  @ApiResponse({ status: 200, description: 'Anomalies export file' })
  exportAnomalies(
    @CurrentTenant() tenantId: string,
    @Query('format') format: 'csv' | 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('anomalyType') anomalyType?: string,
  ) {
    return this.attendanceService.exportAnomalies(
      tenantId,
      { startDate, endDate, employeeId, anomalyType },
      format || 'csv',
    );
  }

  @Get('dashboard/anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team')
  @ApiOperation({ summary: 'Get anomalies dashboard summary' })
  @ApiResponse({ status: 200, description: 'Anomalies dashboard data' })
  getAnomaliesDashboard(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getAnomaliesDashboard(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      user.userId,
      user.permissions || [],
    );
  }

  @Get('analytics/anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies')
  @ApiOperation({ summary: 'Get comprehensive anomalies analytics' })
  @ApiResponse({ status: 200, description: 'Anomalies analytics data' })
  getAnomaliesAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('siteId') siteId?: string,
    @Query('anomalyType') anomalyType?: string,
  ) {
    return this.attendanceService.getAnomaliesAnalytics(tenantId, startDate, endDate, {
      employeeId,
      departmentId,
      siteId,
      anomalyType,
    });
  }

  @Get('reports/monthly-anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies')
  @ApiOperation({ summary: 'Get monthly anomalies report by department' })
  @ApiResponse({ status: 200, description: 'Monthly anomalies report' })
  getMonthlyAnomaliesReport(
    @CurrentTenant() tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.attendanceService.getMonthlyAnomaliesReport(
      tenantId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('alerts/high-anomaly-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('attendance.view_all', 'attendance.view_anomalies')
  @ApiOperation({ summary: 'Get employees with high anomaly rate' })
  @ApiResponse({ status: 200, description: 'List of employees with high anomaly rate' })
  getHighAnomalyRateEmployees(
    @CurrentTenant() tenantId: string,
    @Query('threshold') threshold?: string,
    @Query('days') days?: string,
  ) {
    return this.attendanceService.getHighAnomalyRateEmployees(
      tenantId,
      threshold ? parseInt(threshold, 10) : 5,
      days ? parseInt(days, 10) : 30,
    );
  }
}
