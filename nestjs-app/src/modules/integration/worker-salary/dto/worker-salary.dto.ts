// Worker salary DTO'lari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class WorkerSalaryDto {
  @ApiProperty({ example: 12345678 })
  @Type(() => Number)
  @IsInt()
  pin!: number;

  @ApiPropertyOptional({ example: '2026-05' })
  @IsOptional()
  @IsString()
  month?: string;
}

export class WorkerSalaryMonthsDto {
  @ApiProperty({ example: 12345678 })
  @Type(() => Number)
  @IsInt()
  pin!: number;
}
