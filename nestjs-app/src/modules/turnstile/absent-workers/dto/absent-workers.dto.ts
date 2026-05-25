// GET /api/v1/turnstile/absent-scheduled-workers — Laravel: absentScheduledWorkers.
// Laravel validatsiya: from_date required date, to_date required date after_or_equal.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class AbsentWorkersQueryDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  from_date!: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  to_date!: string;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}
