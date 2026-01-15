import { PartialType } from '@nestjs/swagger';
import { CreateDeviceDto } from './create-device.dto';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {
  @ApiPropertyOptional({ description: 'Intervalle de heartbeat en secondes', minimum: 60, maximum: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  heartbeatInterval?: number;
}
