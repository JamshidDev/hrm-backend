// Worker categories modul DTO'lari.
// Laravel: 5 endpoint — index, store (upsert), update, destroy, reportByOrganizations.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { YearMonthQueryDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * Worker-categories yozuv ustunlari — 26 ta numeric kategoriya.
 * Bu mixin sifatida CreateDto va UpdateDto'da ishlatiladi.
 */
export class WorkerCategoryFieldsDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  external_worker_count?: number;

  @ApiPropertyOptional({ example: 12000000 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  external_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capital_society_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  capital_society_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capital_own_use_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  capital_own_use_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capital_foreign_company_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  capital_foreign_company_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  construction_society_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  construction_society_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  construction_own_use_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  construction_own_use_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  construction_foreign_company_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  construction_foreign_company_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  other_society_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  other_society_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  other_own_use_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  other_own_use_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  other_foreign_company_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  other_foreign_company_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  temporary_contract_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  temporary_contract_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  civil_contract_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  civil_contract_salary_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freelancer_worker_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  freelancer_salary_fund?: number;
}

/**
 * GET /api/v1/economist/worker-categories?year=&organization_id=
 * 12 oylik ko'rinish (paginatsiyasiz).
 */
export class WorkerCategoryListQueryDto {
  @ApiPropertyOptional({ example: 2025, minimum: 2010, maximum: 2030 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}

/**
 * POST /api/v1/economist/worker-categories — upsert.
 * Laravel WorkerCategoryStoreRequest: year, month majburiy; kategoriya field'lari
 * nullable numeric. organization_id YO'Q — auth user'ning organization_id'sidan olinadi.
 */
export class CreateWorkerCategoryDto extends WorkerCategoryFieldsDto {
  // Laravel: year/month `required` → bo'sh bo'lsa "required" xabari (@IsNotEmpty).
  @ApiProperty({ example: 2025 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

/**
 * PUT /api/v1/economist/worker-categories/:id — faqat kategoriya field'lari.
 */
export class UpdateWorkerCategoryDto extends WorkerCategoryFieldsDto {}

/**
 * GET /api/v1/economist/worker-category-organizations?year=&month=
 */
export class WorkerCategoryOrgReportQueryDto extends YearMonthQueryDto {}
