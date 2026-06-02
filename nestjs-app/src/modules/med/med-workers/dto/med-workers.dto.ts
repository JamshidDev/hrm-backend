// Med workers DTO'lar. Laravel: Med/MedController.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

// GET /api/v1/med/workers — paginatsiya + tashkilot filtri.
export class QueryMedWorkersDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  // Laravel: request('organizations') — bitta organization id bo'yicha filter.
  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organizations?: number;
}
