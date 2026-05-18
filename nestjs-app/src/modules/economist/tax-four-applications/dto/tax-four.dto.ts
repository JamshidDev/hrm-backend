// Tax-4 modul DTO'lari.
// Laravel'da bu modul faqat `index` + `downloadExample` ga ega — store/update/destroy
// `apiResource` orqali avto-route qilingan lekin nest controller'ida 500 beradi.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { YearMonthPaginationDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * GET /api/v1/economist/tax-four-applications
 */
export class TaxFourListQueryDto extends YearMonthPaginationDto {
  @ApiPropertyOptional({ description: 'F.I.SH bo`yicha qidiruv' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}

/**
 * POST /api/v1/economist/tax-four-applications (Laravel'da yo'q — stub).
 */
export class CreateTaxFourDto {
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
  pin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;
}

export class UpdateTaxFourDto extends CreateTaxFourDto {}
