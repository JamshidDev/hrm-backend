// WorkerPosition DTO'lari. Laravel: WorkerPositionController.
//
// Bosqich 2 — faqat list (index). Show/edit/CRUD Bosqich 3'da.
// Endpoint: GET /api/v1/hr/worker-positions

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

// PUT /worker-positions/{id}/update
export class UpdateWorkerPositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('department_positions', 'id')
  department_position_id?: number;

  @ApiProperty() @IsString() @IsNotEmpty() contract_number!: string;
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  contract_date!: string;
  @ApiProperty() @IsNotEmpty() group!: number | string;
  @ApiProperty() @IsNotEmpty() rank!: number | string;
  @ApiProperty({ example: 100 }) @Type(() => Number) @IsNumber() rate!: number;
  @ApiProperty() @IsNotEmpty() type!: number | string;
  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber()
  salary!: number;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('schedules', 'id')
  schedule_id!: number;
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  position_date!: string;
}

// POST/PUT /worker-positions/{uuid}/edit/{attach|detach}-role
export class AttachDetachRoleDto {
  @ApiPropertyOptional({ description: 'Role name' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Role id (alternative to name)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;
}

export class QueryWorkerPositionDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  positions?: string;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  department_positions?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contract_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_type?: number;

  // Worker filters.
  @ApiPropertyOptional({ example: 'Karim' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: 'Otabek' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: "Akram o'g'li" })
  @IsOptional()
  @IsString()
  middle_name?: string;
}

// ---------- Response ----------

export class WPWorkerMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b8c0a9...' })
  uuid!: string;

  @ApiProperty({ example: 'https://.../photo.jpg', nullable: true })
  photo!: string | null;

  @ApiProperty({ example: 'Karimov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Otabek', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Akram o'g'li", nullable: true })
  middle_name!: string | null;

  @ApiProperty({ example: '1990-01-15' })
  birthday!: string;

  @ApiProperty({ example: null, nullable: true })
  pin!: number | null;
}

export class WPOrgMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Org', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class WPDeptMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqarma' })
  name!: string;

  @ApiProperty({ example: 1 })
  level!: number;
}

export class WPPositionMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshliq', nullable: true })
  name!: string | null;
}

export class WPTypeDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Asosiy' })
  name!: string;
}

// WorkerPositionResource (index).
export class WorkerPositionListItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b8c0a9...' })
  uuid!: string;

  @ApiProperty({ type: WPWorkerMinDto, nullable: true })
  worker!: WPWorkerMinDto | null;

  @ApiProperty({ type: WPOrgMinDto, nullable: true })
  organization!: WPOrgMinDto | null;

  @ApiProperty({ type: WPDeptMinDto, nullable: true })
  department!: WPDeptMinDto | null;

  @ApiProperty({ type: WPPositionMinDto, nullable: true })
  position!: WPPositionMinDto | null;

  @ApiProperty({ type: WPTypeDto })
  type!: WPTypeDto;

  @ApiProperty({ example: '2020-01-01', nullable: true })
  position_date!: string | null;

  @ApiProperty({ example: 0 })
  group!: number;

  @ApiProperty({ example: '1', nullable: true })
  rank!: string | null;

  @ApiProperty({ example: 100 })
  rate!: number;

  @ApiProperty({ example: 5000000, nullable: true })
  salary!: number | null;
}

export class WorkerPositionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [WorkerPositionListItemDto] })
  data!: WorkerPositionListItemDto[];
}
