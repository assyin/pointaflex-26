import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(tenantId, createDepartmentDto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.departmentsService.findAll(
      tenantId,
      user?.userId,
      user?.permissions,
    );
  }

  @Get('stats')
  getStats(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.departmentsService.getStats(
      tenantId,
      user?.userId,
      user?.permissions,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.departmentsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, tenantId, updateDepartmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.departmentsService.remove(id, tenantId);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.departmentsService.getSettings(id, tenantId);
  }

  @Patch(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: {
      wrongTypeDetectionEnabled?: boolean | null;
      wrongTypeAutoCorrect?: boolean | null;
      wrongTypeShiftMarginMinutes?: number | null;
    },
  ) {
    return this.departmentsService.updateSettings(id, tenantId, data);
  }
}
