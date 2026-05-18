// Economist modullari uchun bazaviy DTO'lar.
// Aksariyat endpointlar (year, month, page, per_page, organization_id) bilan ishlaydi.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Yil/oy filtri bilan paginatsiya — eng keng tarqalgan filtr.
 * Boshqa DTO'lar shu klassdan `extends` qiladi va o'z field'larini qo'shadi.
 */
export class YearMonthPaginationDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    description: 'Sahifada nechta yozuv',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({
    example: 2025,
    minimum: 2010,
    maximum: 2030,
    description: 'Yil',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 12,
    description: 'Oy (1..12)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

/**
 * Faqat year/month (paginatsiyasiz) — dashboard, decoding, structure.
 */
export class YearMonthQueryDto {
  @ApiPropertyOptional({
    example: 2025,
    minimum: 2010,
    maximum: 2030,
    description: 'Yil',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 12,
    description: 'Oy (1..12)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

/**
 * Year-only DTO — faqat yillik aggregatsiyalar (decoding, by-position export).
 */
export class YearOnlyQueryDto {
  @ApiPropertyOptional({
    example: 2025,
    minimum: 2010,
    maximum: 2030,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;
}

/**
 * Organization filtri — ko'p hisobotlarda kerakli qo'shimcha filtr.
 */
export class OrganizationFilterDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Tashkilot ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}
