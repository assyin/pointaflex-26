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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegacyRole } from '@prisma/client';

@ApiTags('Shifts')
@Controller('shifts')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Post()
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Create new shift' })
  create(@CurrentUser() user: any, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isNightShift') isNightShift?: string,
  ) {
    return this.shiftsService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        search,
        isNightShift: isNightShift ? isNightShift === 'true' : undefined,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shiftsService.findOne(user.tenantId, id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get shift usage statistics' })
  getUsage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shiftsService.getShiftUsage(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Update shift' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Delete shift' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shiftsService.remove(user.tenantId, id);
  }
}