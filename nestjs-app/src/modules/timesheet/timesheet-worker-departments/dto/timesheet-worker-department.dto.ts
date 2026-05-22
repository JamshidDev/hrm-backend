// TimeSheetWorkerDepartment DTO'lari. Laravel: TimeSheetWorkerDepartmentController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryTimeSheetWorkerDepartmentDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Vergul bilan ajratilgan organization id lar',
    example: '151,154,186',
  })
  @IsOptional()
  @IsString()
  organizations?: string;
}

export class AttachDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number) @IsInt() @Exists('worker_positions', 'id')
  worker_position_id!: number;

  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray() @Type(() => Number)
  departments!: number[];
}

export class DetachDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  worker_position_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  department_id?: number;
}

// ---------- Response ----------

export class TWDWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class TWDDepartmentDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) level!: number | null;
}

export class TWDOrganizationDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class TWDDepartmentSubDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: TWDOrganizationDto, nullable: true })
  organization!: TWDOrganizationDto | null;
  @ApiProperty({ type: TWDDepartmentDto, nullable: true })
  department!: TWDDepartmentDto | null;
}

export class TimeSheetWorkerDepartmentItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: TWDWorkerDto, nullable: true })
  worker!: TWDWorkerDto | null;
  @ApiProperty() position_name!: string;
  @ApiProperty({ type: [TWDDepartmentSubDto] })
  departments!: TWDDepartmentSubDto[];
}

export class TimeSheetWorkerDepartmentListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TimeSheetWorkerDepartmentItemDto] })
  data!: TimeSheetWorkerDepartmentItemDto[];
}
