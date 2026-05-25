// DepartmentPosition DTO'lari. Laravel: HR/DepartmentPositionController.
//
// Endpointlar:
//   - GET    /department-positions       (index — DepartmentPositionWithJoinResource)
//   - GET    /department-positions/{id}  (show — DepartmentPositionResource)
//   - POST   /department-positions       (store)
//   - PUT    /department-positions/{id}  (update — Laravel "transaction + syncWorkerPositions" yo'q,
//                                          parity uchun oddiy update)
//   - DELETE /department-positions/{id}  (destroy — soft delete + status change)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryDepartmentPositionDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
}

export class CreateDepartmentPositionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('departments', 'id')
  department_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('positions', 'id')
  position_id!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  rate!: number;

  @ApiProperty({ example: 1, description: 'EducationEnum 1..3' })
  @Type(() => Number)
  @IsInt()
  education!: number;

  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  rank!: string;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsInt()
  salary!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  group!: number;

  @ApiProperty({ example: '10' })
  @IsNotEmpty()
  max_rank!: string;
}

export class UpdateDepartmentPositionDto extends CreateDepartmentPositionDto {}

// ========== RESPONSE ==========

// Min shapes used inside WithJoin resource.
export class DPOrganizationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class DPDepartmentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshqarma', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  level!: number | null;
}

export class DPPositionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshliq', nullable: true })
  name!: string | null;
}

export class DPIdNameDto {
  @ApiProperty({ example: 1, nullable: true })
  id!: number | string | null;

  @ApiProperty({ example: 'Yangi', nullable: true })
  name!: number | string | null;
}

// DepartmentPositionWithJoinResource (index).
export class DepartmentPositionWithJoinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: DPOrganizationDto })
  organization!: DPOrganizationDto;

  @ApiProperty({ type: DPDepartmentDto })
  department!: DPDepartmentDto;

  @ApiProperty({ type: DPPositionDto })
  position!: DPPositionDto;

  @ApiProperty({ example: 100 })
  rate!: number;

  @ApiProperty({ example: 1 })
  worker_rate!: number;

  @ApiProperty({ type: DPIdNameDto })
  group!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  rank!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  max_rank!: DPIdNameDto;

  @ApiProperty({ example: 5000000, nullable: true })
  salary!: number | null;

  @ApiProperty({ example: 0 })
  experience!: number;

  @ApiProperty({ type: DPIdNameDto })
  education!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  status!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  changed_status!: DPIdNameDto;
}

// Show — full Position object embedded (PositionResource).
export class DPPositionFullDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Boshliq' })
  name!: string;

  @ApiProperty({ example: null, nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: null, nullable: true })
  classification_index!: number | null;

  @ApiProperty({ example: null, nullable: true })
  classification_code!: number | null;
}

// DepartmentPositionResource (show).
export class DepartmentPositionShowDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: DPOrganizationDto, nullable: true })
  organization!: DPOrganizationDto | null;

  @ApiProperty({ type: DPDepartmentDto, nullable: true })
  department!: DPDepartmentDto | null;

  @ApiProperty({ type: DPPositionFullDto, nullable: true })
  position!: DPPositionFullDto | null;

  @ApiProperty({ example: 100 })
  rate!: number;

  @ApiProperty({ example: 1 })
  worker_rate!: number;

  @ApiProperty({ type: DPIdNameDto })
  group!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  rank!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  max_rank!: DPIdNameDto;

  @ApiProperty({ example: 5000000, nullable: true })
  salary!: number | null;

  @ApiProperty({ example: 0 })
  experience!: number;

  @ApiProperty({ type: DPIdNameDto })
  education!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  status!: DPIdNameDto;

  @ApiProperty({ type: DPIdNameDto })
  changed_status!: DPIdNameDto;
}

export class DepartmentPositionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [DepartmentPositionWithJoinDto] })
  data!: DepartmentPositionWithJoinDto[];
}
