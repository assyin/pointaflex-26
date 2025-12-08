import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'Employee ID to add to the team' })
  @IsUUID()
  employeeId: string;
}

