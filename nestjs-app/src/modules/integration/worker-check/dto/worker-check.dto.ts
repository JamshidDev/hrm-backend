// Worker check DTO.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class WorkerCheckDto {
  @ApiPropertyOptional({ example: 12345678 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  uuid?: string;
}
