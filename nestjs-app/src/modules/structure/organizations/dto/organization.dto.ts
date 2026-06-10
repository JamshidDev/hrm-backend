// Organization DTO'lari. Laravel: OrganizationController + OrganizationResource/ListResource.
//
// Read endpoints:
//   - GET /organizations          — root orgs paginate (whereIsRoot)
//   - GET /organization-list      — list filtered by search (no paginate)
//   - GET /organization-levels    — enum list
//   - GET /organizations/:id      — single + children
//
// Write endpoints (NestedSet rebalancing complex — basic version, _lft/_rgt yangilash Laravel'da):
//   - POST /organizations         — yangi org (basic insert)
//   - PUT  /organizations/:id     — yangilash
//   - DEL  /organizations/:id     — force delete

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';
import { CityItemDto } from '@/modules/structure/cities/dto/city.dto';

export class QueryOrganizationDto extends SearchPaginationQueryDto {}

export class QueryOrganizationListDto {
  @ApiPropertyOptional({ example: 'temir' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  city_id!: number;

  @ApiProperty({ example: 'Tashkilot nomi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Название организации', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string | null;

  @ApiPropertyOptional({ example: 'Organization name', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string | null;

  @ApiProperty({ example: '"Tashkilot nomi" AJ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  full_name!: string;

  @ApiProperty({ example: 4, description: 'OrganizationLevel: 1..4' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level!: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  group?: boolean;

  @ApiProperty({ example: 'TASH001', maxLength: 15 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  code!: string;

  @ApiPropertyOptional({ example: 123456789, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  inn?: number | null;

  @ApiPropertyOptional({ example: '41.3', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lat?: string | null;

  @ApiPropertyOptional({ example: '69.2', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  long?: string | null;

  @ApiPropertyOptional({ example: 'Toshkent sh.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ example: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  external?: number | null;

  @ApiPropertyOptional({ example: 'Toshkent sh.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  command_address?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  parent_id?: number;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  city_id?: number;

  @ApiPropertyOptional({ example: 'Tashkilot nomi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: '"Tashkilot nomi" AJ' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  group?: boolean;

  @ApiPropertyOptional({ example: 'TASH001' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  code?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  external?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number;
}

// ========== RESPONSE ==========

// OrganizationResource (full): { id, name, full_name, level, parent_id, city, lat, long, code, descendants }
export class OrganizationItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '"Tashkilot nomi" AJ', nullable: true })
  full_name!: string | null;

  @ApiProperty({ example: 4 })
  level!: number;

  @ApiProperty({ example: null, nullable: true })
  parent_id!: number | null;

  @ApiProperty({ type: CityItemDto, nullable: true })
  city!: CityItemDto | null;

  @ApiProperty({ example: '41.3', nullable: true })
  lat!: string | null;

  @ApiProperty({ example: '69.2', nullable: true })
  long!: string | null;

  @ApiProperty({ example: 'TASH001' })
  code!: string;

  @ApiProperty({ example: 5, description: 'Descendants count' })
  descendants!: number;
}

export class OrganizationListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [OrganizationItemDto] })
  data!: OrganizationItemDto[];
}

// OrganizationListResource (minimal — for /organization-list): { id, name (localized), group }
export class OrganizationListMinimalDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

// /organization-levels response — array of {id, name}
export class OrganizationLevelDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Departament' })
  name!: string;
}

// Show endpoint — { organization, children }
export class OrganizationShowResponseDto {
  @ApiProperty({ type: OrganizationItemDto })
  organization!: OrganizationItemDto;

  @ApiProperty({ type: [OrganizationItemDto] })
  children!: OrganizationItemDto[];
}
