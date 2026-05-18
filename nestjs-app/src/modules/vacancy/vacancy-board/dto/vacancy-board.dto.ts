// Vacancy board DTO'lar. Laravel: Vacancy/VacancyController.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

// Vakansiyalar ro'yxati uchun filter query.
export class QueryVacancyBoardDto {
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

  @ApiPropertyOptional({ description: 'Filter by organization id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional({ description: 'Filter by city id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  city_id?: number;

  @ApiPropertyOptional({ description: 'Filter by region id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number;
}
