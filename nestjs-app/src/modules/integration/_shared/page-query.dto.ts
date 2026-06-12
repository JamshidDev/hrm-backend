// Integration sub-modullari uchun umumiy PageQueryDto.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class IntegrationPageQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ example: 'Akmal' })
  @IsOptional()
  @IsString()
  search?: string;
}

/** GET /integration/structure — search + organization_id (rol-asosli org tree). */
export class IntegrationStructureQueryDto {
  @ApiPropertyOptional({ example: 'UTY' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

/** Dashboard / turnstile event endpointlari uchun — `date` majburiy (Laravel parity). */
export class IntegrationDateQueryDto {
  @ApiProperty({ example: '2026-05-18', description: 'YYYY-MM-DD format' })
  @IsDateString()
  date!: string;
}

export function pageOf(q?: { page?: number; per_page?: number }) {
  const page = Math.max(1, Number(q?.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
  return { page, perPage, offset: (page - 1) * perPage };
}
