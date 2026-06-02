// Statements modul DTO'lari — apiResource + extras + 4 ta Excel export.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  YearMonthPaginationDto,
  YearMonthQueryDto,
  YearOnlyQueryDto,
} from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * GET /api/v1/economist/statements
 * year/month filtri bilan paginatsiya + ixtiyoriy search/code/status.
 */
export class StatementListQueryDto extends YearMonthPaginationDto {
  @ApiPropertyOptional({
    example: '151,154',
    description: 'CSV organization ids',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ description: 'F.I.SH yoki PIN bo`yicha qidiruv' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Faqat shu kodga ega yozuvlar (3 raqam)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Mavjud bo`lsa — worker_id biriktirilmagan (NULL) yozuvlar',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'sort_by ustun nomi' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Soatlar oraliq boshlanishi' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  start_hours?: number;

  @ApiPropertyOptional({ description: 'Soatlar oraliq oxiri' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  end_hours?: number;
}

/**
 * GET /api/v1/economist/statement-decoding?year=&month=&organizations=&lang=
 */
export class StatementDecodingQueryDto extends YearOnlyQueryDto {
  @ApiPropertyOptional({ description: 'Oy (1-12)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Vergul bilan ajratilgan tashkilot ID`lari',
    example: '1,3,5',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru', 'en'], example: 'uz' })
  @IsOptional()
  @IsString()
  lang?: string;

  // Laravel: 'download' => nullable — mavjud bo'lsa Excel export (async task).
  @ApiPropertyOptional({ description: 'Mavjud bo`lsa — Excel export trigger' })
  @IsOptional()
  @IsString()
  download?: string;
}

/**
 * GET /api/v1/economist/statement-decoding-organizations?year=&month=&organizations=&lang=
 */
export class StatementDecodingByOrgQueryDto extends YearMonthQueryDto {
  @ApiPropertyOptional({
    description: 'Vergul bilan ajratilgan tashkilot ID`lari',
    example: '1,3,5',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru', 'en'] })
  @IsOptional()
  @IsString()
  lang?: string;
}

/**
 * GET /api/v1/economist/statements-multiple-workers
 */
export class MultiWorkersQueryDto extends YearMonthPaginationDto {}

/**
 * GET /api/v1/economist/statements-by-positions
 */
export class ByPositionsQueryDto extends YearMonthPaginationDto {
  @ApiPropertyOptional({
    description: 'Vergul bilan ajratilgan position ID`lari',
  })
  @IsOptional()
  @IsString()
  positions?: string;
}

/**
 * POST /api/v1/economist/statements (manual create — stub).
 * Field'lar ko'p (statements jadvalida 200+ ustun), shuning uchun open shape qoldiramiz.
 */
export class CreateStatementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  worker_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
}

/**
 * PUT /api/v1/economist/statements/:id (manual update — stub).
 */
export class UpdateStatementDto extends CreateStatementDto {}

/**
 * POST /api/v1/economist/statements-export-with-codes
 */
export class ExportWithCodesDto {
  @ApiProperty({ example: 2025, minimum: 2010, maximum: 2030 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ type: [String], example: ['002', '003'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  codes!: string[];

  // Laravel: 'type' => required|string|in:organizations,workers
  @ApiProperty({ enum: ['organizations', 'workers'], example: 'workers' })
  @IsIn(['organizations', 'workers'])
  type!: string;

  @ApiPropertyOptional({
    example: '140',
    description: 'CSV org ids (by-organizations variant)',
  })
  @IsOptional()
  @IsString()
  organizations?: string;
}

/**
 * POST /api/v1/economist/statements-export-with-codes-by-year
 */
export class ExportWithCodesByYearDto {
  @ApiProperty({ example: 2025 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  // Laravel: 'type' => required|string ('code' → s_<code>, aks holda total_four)
  @ApiProperty({ example: 'code' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ type: [String], example: ['002', '003'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codes?: string[];
}

/**
 * GET /api/v1/economist/statements-export-by-position?year=&organization_id=
 */
export class ExportByPositionQueryDto extends YearOnlyQueryDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}

/**
 * GET /api/v1/economist/statements-export-multiple-workers?year=&month=
 */
export class ExportMultiWorkersQueryDto extends YearMonthQueryDto {}

/**
 * GET /api/v1/economist/statements-export-decoding-by-month?year=
 */
export class ExportDecodingByMonthQueryDto extends YearOnlyQueryDto {}
