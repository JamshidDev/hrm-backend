// University DTO'lari. Laravel: UniversityController + UniversityResource.
// Resource: { id, city: CityResource, education: {id, name}, type: {id, name}, name, name_ru, name_en }.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';
import {
  CityRegionMinimalDto,
  CityItemDto,
} from '@/modules/structure/cities/dto/city.dto';

export class QueryUniversityDto extends SearchPaginationQueryDto {}

export class CreateUniversityDto {
  @ApiProperty({ example: 'Toshkent davlat universiteti' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Ташкентский государственный университет' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Tashkent State University' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  city_id!: number;

  // Laravel rules: required (lekin enum range tekshirilmagan).
  // Bizda EducationEnum: 1, 2, 3 (HIGH, MEDIUM_SPECIAL, MEDIUM).
  @ApiProperty({ example: 1, description: '1=Oliy, 2=O‘rta maxsus, 3=O‘rta' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  education!: number;

  // UniversityTypeEnum: 1..6.
  @ApiProperty({ example: 1, description: '1..6 — UniversityType' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  type!: number;
}

export class UpdateUniversityDto extends CreateUniversityDto {}

// ========== RESPONSE ==========

export class UniversityEnumItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Oliy' })
  name!: string;
}

export class UniversityItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  // Laravel UniversityResource'da `new CityResource($this->city)` — to'liq CityResource.
  // CityResource: { id, region: minimal, name, name_ru, name_en, lat, long }
  @ApiProperty({ nullable: true })
  city!: {
    id: number;
    region: CityRegionMinimalDto | null;
    name: string;
    name_ru: string | null;
    name_en: string | null;
    lat: string | null;
    long: string | null;
  } | null;

  @ApiProperty({ type: UniversityEnumItemDto })
  education!: UniversityEnumItemDto;

  @ApiProperty({ type: UniversityEnumItemDto })
  type!: UniversityEnumItemDto;

  @ApiProperty({ example: 'Toshkent davlat universiteti' })
  name!: string;

  @ApiProperty({
    example: 'Ташкентский государственный университет',
    nullable: true,
  })
  name_ru!: string | null;

  @ApiProperty({ example: 'Tashkent State University', nullable: true })
  name_en!: string | null;
}

export class UniversityListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [UniversityItemDto] })
  data!: UniversityItemDto[];
}

// Re-export — tipi ishlatilsin uchun.
export { CityItemDto };
