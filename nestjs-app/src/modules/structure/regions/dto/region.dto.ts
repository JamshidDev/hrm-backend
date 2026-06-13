// Region DTO'lari. Laravel: Modules/Structure/Http/Controllers/RegionController + RegionResource.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';
import { CountryItemDto } from '@/modules/structure/countries/dto/country.dto';

// ========== REQUEST ==========

export class QueryRegionDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  country_id?: number;
}

export class CreateRegionDto {
  // Laravel: country_id required.
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Exists('countries', 'id')
  country_id!: number;

  @ApiProperty({ example: 'Toshkent shahri' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'г. Ташкент' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiPropertyOptional({ example: '41.3111' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lat?: string;

  @ApiPropertyOptional({ example: '69.2797' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  long?: string;
}

export class UpdateRegionDto extends CreateRegionDto {}

// ========== RESPONSE ==========

export class RegionItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: CountryItemDto, nullable: true })
  country!: CountryItemDto | null;

  @ApiProperty({ example: 'Toshkent shahri' })
  name!: string;

  @ApiProperty({ example: 'г. Ташкент', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Tashkent', nullable: true })
  name_en!: string | null;

  @ApiProperty({ example: '41.3111', nullable: true })
  lat!: string | null;

  @ApiProperty({ example: '69.2797', nullable: true })
  long!: string | null;
}

export class RegionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 14 })
  total!: number;

  @ApiProperty({ type: [RegionItemDto] })
  data!: RegionItemDto[];
}
