// TimeSheet DTO'lari. Laravel: TimeSheet/TimeSheetController.
//
// Endpointlar:
//   - GET    /api/v1/timesheet
//   - POST   /api/v1/timesheet
//   - PUT    /api/v1/timesheet/{id}
//   - DELETE /api/v1/timesheet/{id}
//   - POST   /api/v1/timesheet/{id}/accept

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryTimeSheetDto extends SearchPaginationQueryDto {}

export class CreateTimeSheetDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number) @IsInt()
  year!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number) @IsInt()
  month!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Exists('departments', 'id')
  department_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Exists('organizations', 'id')
  work_place_id?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  status?: boolean;
}

export class UpdateTimeSheetDto extends CreateTimeSheetDto {}

// ---------- Response ----------

export class TimeSheetDepartmentDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
}

export class TimeSheetOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class TimeSheetItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: TimeSheetDepartmentDto, nullable: true })
  department!: TimeSheetDepartmentDto | null;
  @ApiProperty({ type: TimeSheetOrgDto, nullable: true })
  work_place!: TimeSheetOrgDto | null;
  @ApiProperty() year!: number;
  @ApiProperty() month!: number;
  @ApiProperty() status!: boolean;
  @ApiProperty({ nullable: true }) confirmation_file!: string | null;
  @ApiProperty() confirmation!: { id: number; name: string };
  @ApiProperty() workers_count!: number;
}

export class TimeSheetListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TimeSheetItemDto] }) data!: TimeSheetItemDto[];
}
