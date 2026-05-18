// Tax-5 modul DTO'lari (Laravel'da faqat index + downloadExample).

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { YearMonthPaginationDto } from '@/modules/economist/_shared/dto/base-query.dto';

export class TaxFiveListQueryDto extends YearMonthPaginationDto {
  @ApiPropertyOptional()
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

export class CreateTaxFiveDto {
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
}

export class UpdateTaxFiveDto extends CreateTaxFiveDto {}
