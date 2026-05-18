// City DTO'lari. Laravel: Modules/Structure/Http/Controllers/CityController + CityResource.
// CityResource'da region — RegionMinimalResource (faqat {id, name}).

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

// ========== REQUEST ==========

export class QueryCityDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number;
}

export class CreateCityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('regions', 'id')
  region_id!: number;

  @ApiProperty({ example: 'Yunusobod tumani' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Юнусабад' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Yunusabad' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiPropertyOptional({ example: '41.3611' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lat?: string;

  @ApiPropertyOptional({ example: '69.2891' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  long?: string;
}

export class UpdateCityDto extends CreateCityDto {}

// ========== RESPONSE ==========

export class CityRegionMinimalDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Toshkent shahri' })
  name!: string;
}

export class CityItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: CityRegionMinimalDto, nullable: true })
  region!: CityRegionMinimalDto | null;

  @ApiProperty({ example: 'Yunusobod tumani' })
  name!: string;

  @ApiProperty({ example: 'Юнусабад', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Yunusabad', nullable: true })
  name_en!: string | null;

  @ApiProperty({ example: '41.3611', nullable: true })
  lat!: string | null;

  @ApiProperty({ example: '69.2891', nullable: true })
  long!: string | null;
}

export class CityListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 200 })
  total!: number;

  @ApiProperty({ type: [CityItemDto] })
  data!: CityItemDto[];
}
