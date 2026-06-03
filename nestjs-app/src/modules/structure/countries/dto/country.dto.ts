// Country DTO'lari. Laravel: Modules/Structure/Http/Controllers/CountryController + CountryResource.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

// ========== REQUEST ==========

export class QueryCountryDto extends SearchPaginationQueryDto {}

export class CreateCountryDto {
  @ApiProperty({ example: 'Uzbekistan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Узбекистан' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Uzbekistan' })
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

export class UpdateCountryDto extends CreateCountryDto {}

// ========== RESPONSE ==========

export class CountryItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Uzbekistan' })
  name!: string;

  @ApiProperty({ example: 'Узбекистан', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Uzbekistan', nullable: true })
  name_en!: string | null;

  @ApiProperty({ example: '41.3111', nullable: true })
  lat!: string | null;

  @ApiProperty({ example: '69.2797', nullable: true })
  long!: string | null;

  @ApiProperty({ example: '2024-10-20T11:39:56.000000Z', nullable: true })
  created_at!: string | null;
}

export class CountryListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [CountryItemDto] })
  data!: CountryItemDto[];
}
