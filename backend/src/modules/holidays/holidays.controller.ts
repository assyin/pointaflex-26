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
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Holidays')
@Controller('holidays')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau jour férié' })
  create(@CurrentUser() user: any, @Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les jours fériés' })
  @ApiQuery({ name: 'year', required: false, description: 'Filtrer par année (ex: 2025)' })
  findAll(@CurrentUser() user: any, @Query('year') year?: string) {
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('User not authenticated or tenantId missing');
    }
    return this.holidaysService.findAll(user.tenantId, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un jour férié par ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.holidaysService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un jour férié' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un jour férié' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.holidaysService.remove(user.tenantId, id);
  }

  @Post('import-csv')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importer des jours fériés depuis un fichier CSV' })
  async importCsv(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Aucun fichier téléchargé',
      };
    }

    if (!file.originalname.match(/\.(csv|xlsx|xls)$/)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Format de fichier invalide. Seuls les fichiers CSV, XLSX et XLS sont acceptés.',
      };
    }

    const result = await this.holidaysService.importFromCsv(user.tenantId, file.buffer);

    return {
      statusCode: HttpStatus.OK,
      message: `Import terminé: ${result.success} jour(s) férié(s) importé(s), ${result.skipped} ignoré(s)`,
      data: result,
    };
  }
}
