import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkMembersDto {
  @ApiProperty({ 
    description: 'Array of employee IDs to add or remove',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3']
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  employeeIds: string[];
}

