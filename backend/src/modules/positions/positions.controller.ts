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
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createPositionDto: CreatePositionDto,
  ) {
    return this.positionsService.create(tenantId, createPositionDto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
  ) {
    return this.positionsService.findAll(tenantId, category);
  }

  @Get('stats')
  getStats(@CurrentTenant() tenantId: string) {
    return this.positionsService.getStats(tenantId);
  }

  @Get('categories')
  getCategories(@CurrentTenant() tenantId: string) {
    return this.positionsService.getCategories(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.positionsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.positionsService.update(id, tenantId, updatePositionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.positionsService.remove(id, tenantId);
  }
}
