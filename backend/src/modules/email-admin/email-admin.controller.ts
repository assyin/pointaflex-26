import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailAdminService } from './email-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CreateEmailConfigDto,
  UpdateEmailConfigDto,
  TestSmtpConnectionDto,
  SendTestEmailDto,
  SendTemplateTestDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
  EmailLogsQueryDto,
} from './dto';

@ApiTags('Email Admin')
@Controller('email-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailAdminController {
  constructor(private readonly emailAdminService: EmailAdminService) {}

  // ==================== EMAIL CONFIG ====================

  @Get('config')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Get email configuration for current tenant' })
  async getEmailConfig(@Request() req) {
    return this.emailAdminService.getEmailConfig(req.user.tenantId);
  }

  @Post('config')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Create email configuration' })
  async createEmailConfig(@Request() req, @Body() dto: CreateEmailConfigDto) {
    return this.emailAdminService.upsertEmailConfig(req.user.tenantId, dto);
  }

  @Put('config')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Update email configuration' })
  async updateEmailConfig(@Request() req, @Body() dto: UpdateEmailConfigDto) {
    return this.emailAdminService.upsertEmailConfig(req.user.tenantId, dto);
  }

  @Post('config/test-connection')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Test SMTP connection' })
  async testSmtpConnection(@Body() dto: TestSmtpConnectionDto) {
    return this.emailAdminService.testSmtpConnection(dto);
  }

  @Post('config/send-test')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Send test email' })
  async sendTestEmail(@Request() req, @Body() dto: SendTestEmailDto) {
    return this.emailAdminService.sendTestEmail(req.user.tenantId, dto);
  }

  // ==================== EMAIL TEMPLATES ====================

  @Get('templates')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Get all email templates' })
  async getEmailTemplates(@Request() req) {
    return this.emailAdminService.getEmailTemplates(req.user.tenantId);
  }

  @Get('templates/:id')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Get email template by ID' })
  async getEmailTemplate(@Request() req, @Param('id') id: string) {
    return this.emailAdminService.getEmailTemplate(id, req.user.tenantId);
  }

  @Post('templates')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Create new email template' })
  async createEmailTemplate(@Request() req, @Body() dto: CreateEmailTemplateDto) {
    return this.emailAdminService.createEmailTemplate(req.user.tenantId, dto);
  }

  @Put('templates/:id')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Update email template' })
  async updateEmailTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailAdminService.updateEmailTemplate(id, req.user.tenantId, dto);
  }

  @Delete('templates/:id')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Delete email template' })
  async deleteEmailTemplate(@Request() req, @Param('id') id: string) {
    return this.emailAdminService.deleteEmailTemplate(id, req.user.tenantId);
  }

  @Post('templates/preview')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Preview email template with variables' })
  async previewEmailTemplate(@Body() dto: PreviewEmailTemplateDto) {
    return this.emailAdminService.previewEmailTemplate(dto);
  }

  @Post('templates/send-test')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Send test email with template' })
  async sendTemplateTest(@Request() req, @Body() dto: SendTemplateTestDto) {
    return this.emailAdminService.sendTemplateTest(req.user.tenantId, dto);
  }

  @Post('templates/initialize-defaults')
  @RequirePermissions('tenant.update_settings')
  @ApiOperation({ summary: 'Initialize default email templates' })
  async initializeDefaultTemplates(@Request() req) {
    await this.emailAdminService.initializeDefaultTemplates(req.user.tenantId);
    return { message: 'Templates par défaut initialisés avec succès' };
  }

  // ==================== EMAIL LOGS ====================

  @Get('logs')
  @RequirePermissions('tenant.update_settings', 'reports.view_all')
  @ApiOperation({ summary: 'Get email logs with filters and pagination' })
  async getEmailLogs(@Request() req, @Query() query: EmailLogsQueryDto) {
    return this.emailAdminService.getEmailLogs(req.user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('tenant.update_settings', 'reports.view_all')
  @ApiOperation({ summary: 'Get email statistics' })
  async getEmailStats(@Request() req) {
    return this.emailAdminService.getEmailStats(req.user.tenantId);
  }
}

