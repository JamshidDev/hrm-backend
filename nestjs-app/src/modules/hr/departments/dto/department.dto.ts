// Department DTO'lari. Laravel: HR/DepartmentController + 5 ta resource.
//
// Endpointlar:
//   - GET    /departments          (index — DepartmentWithJoinResource)
//   - GET    /departments/list     (DepartmentListResource)
//   - GET    /departments/levels   (enum)
//   - GET    /departments/{id}     (show + children — DepartmentShowResource)
//   - GET    /departments-tree     (full tree — DepartmentTreeResource)
//   - POST   /departments          (basic — NestedSet rebalance Laravel'da)
//   - PUT    /departments/{id}
//   - DELETE /departments/{id}

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

export class QueryDepartmentDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  // departments-tree: Laravel `when(request('id'))` — bitta department.
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  // departments-tree: Laravel `when(request('ids'))` — vergulli ro'yxat.
  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  ids?: string;
}

// Laravel DepartmentStoreRequest: { name, name_ru?, name_en?, comment?, level,
//   parent_id?, organization_id? } — organization_id nullable, fallback user.org.
export class CreateDepartmentDto {
  @ApiProperty({ example: 'Boshqarma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Управление', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string | null;

  @ApiPropertyOptional({ example: 'Management', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string | null;

  @ApiPropertyOptional({ example: 'Izoh', nullable: true })
  @IsOptional()
  @IsString()
  comment?: string | null;

  @ApiProperty({ example: 1, description: '1..14 — DepartmentLevelEnum' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level!: number;

  // Laravel: 'region_id' => ['nullable', 'integer'].
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number | null;

  // Laravel: 'city_id' => ['required', 'integer'].
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  city_id!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('departments', 'id')
  parent_id?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id?: number | null;
}

// Laravel DepartmentUpdateRequest: { name, name_ru?, name_en?, comment?, level,
//   parent_id? } — `organization_id` qabul qilinmaydi (mavjudi saqlanadi).
export class UpdateDepartmentDto {
  @ApiProperty({ example: 'Boshqarma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Управление', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string | null;

  @ApiPropertyOptional({ example: 'Management', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string | null;

  @ApiPropertyOptional({ example: 'Izoh', nullable: true })
  @IsOptional()
  @IsString()
  comment?: string | null;

  @ApiProperty({ example: 1, description: '1..14 — DepartmentLevelEnum' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level!: number;

  // Laravel: 'region_id' => ['nullable', 'integer'].
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number | null;

  // Laravel: 'city_id' => ['required', 'integer'] — update'da ham required.
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  city_id!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('departments', 'id')
  parent_id?: number | null;
}

// ========== RESPONSE ==========

export class DepartmentLevelDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqaruv hodimlari' })
  name!: string;
}

// OrganizationListResource minimal.
export class DepartmentOrgMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

// DepartmentListResource minimal — used as `parent` field inside DepartmentWithJoin.
export class DepartmentParentMinDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Ijro intizomi va nazorati bo‘limi' })
  name!: string;

  @ApiProperty({ example: 4 })
  level!: number;
}

// DepartmentResource (show endpoint): {id, name, level, name_ru, name_en, comment, organization}.
export class DepartmentItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqarma' })
  name!: string;

  @ApiProperty({ type: DepartmentLevelDto })
  level!: DepartmentLevelDto;

  @ApiProperty({ example: 'Управление', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Management', nullable: true })
  name_en!: string | null;

  @ApiProperty({ example: '...', nullable: true })
  comment!: string | null;

  @ApiProperty({ type: DepartmentOrgMinDto, nullable: true })
  organization!: DepartmentOrgMinDto | null;
}

// CityOnlyResource — {id, name, name_ru, name_en}.
export class DepartmentCityDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Toshkent', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'Ташкент', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Tashkent', nullable: true })
  name_en!: string | null;
}

// RegionMinimalResource — {id, name}.
export class DepartmentRegionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Toshkent viloyati', nullable: true })
  name!: string | null;
}

// DepartmentWithJoinResource (index endpoint) — extends DepartmentItem with parent/worker_rate/children flag.
export class DepartmentWithJoinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqaruv apparati' })
  name!: string;

  @ApiProperty({ type: DepartmentLevelDto })
  level!: DepartmentLevelDto;

  @ApiProperty({ type: DepartmentParentMinDto, nullable: true })
  parent!: DepartmentParentMinDto | null;

  @ApiProperty({ example: 10 })
  worker_rate!: number;

  @ApiProperty({ example: null, nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: null, nullable: true })
  name_en!: string | null;

  @ApiProperty({ example: null, nullable: true })
  comment!: string | null;

  @ApiProperty({ type: DepartmentOrgMinDto, nullable: true })
  organization!: DepartmentOrgMinDto | null;

  @ApiProperty({ example: false })
  children!: boolean;

  @ApiProperty({ type: DepartmentCityDto, nullable: true })
  city!: DepartmentCityDto | null;

  @ApiProperty({ type: DepartmentRegionDto, nullable: true })
  region!: DepartmentRegionDto | null;
}

// DepartmentListResource — minimal (Laravel: id+name+level int).
export class DepartmentListMinimalDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqarma' })
  name!: string;

  @ApiProperty({ example: 1 })
  level!: number;
}

export class DepartmentListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [DepartmentWithJoinDto] })
  data!: DepartmentWithJoinDto[];
}

export class DepartmentListMinResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 200 })
  total!: number;

  @ApiProperty({ type: [DepartmentListMinimalDto] })
  data!: DepartmentListMinimalDto[];
}

// Show response.
export class DepartmentShowResponseDto {
  @ApiProperty({ type: DepartmentItemDto })
  department!: DepartmentItemDto;

  @ApiProperty({ type: [DepartmentItemDto] })
  children!: DepartmentItemDto[];
}

// Tree node — Laravel DepartmentTreeResource.
export class DepartmentTreeParentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqaruv apparati', nullable: true })
  name!: string | null;
}

export class DepartmentTreeNodeDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqarma' })
  name!: string;

  @ApiProperty({ type: DepartmentLevelDto })
  level!: DepartmentLevelDto;

  @ApiProperty({ type: DepartmentTreeParentDto, nullable: true })
  parent!: DepartmentTreeParentDto | null;

  @ApiProperty({ type: () => [DepartmentTreeNodeDto] })
  children!: DepartmentTreeNodeDto[];

  @ApiProperty({ example: 1 })
  organization_id!: number;
}
