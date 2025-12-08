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
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { BulkMembersDto } from './dto/bulk-members.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Teams')
@Controller('teams')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create new team' })
  create(@CurrentUser() user: any, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rotationEnabled') rotationEnabled?: string,
  ) {
    return this.teamsService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        search,
        rotationEnabled: rotationEnabled ? rotationEnabled === 'true' : undefined,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.teamsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Update team' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH)
  @ApiOperation({ summary: 'Delete team' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.teamsService.remove(user.tenantId, id);
  }

  @Post(':id/members')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Add a member to the team' })
  addMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(user.tenantId, id, dto);
  }

  @Delete(':id/members/:employeeId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Remove a member from the team' })
  removeMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.teamsService.removeMember(user.tenantId, id, employeeId);
  }

  @Post(':id/members/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Add multiple members to the team' })
  addMembersBulk(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: BulkMembersDto,
  ) {
    return this.teamsService.addMembersBulk(user.tenantId, id, dto);
  }

  @Delete(':id/members/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Remove multiple members from the team' })
  removeMembersBulk(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: BulkMembersDto,
  ) {
    return this.teamsService.removeMembersBulk(user.tenantId, id, dto);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get team statistics' })
  getTeamStats(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.teamsService.getTeamStats(user.tenantId, id);
  }
}
