// Filter endpoints DTO'lari. Laravel: HR/FilterController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class FilterDepartmentPositionsQueryDto {
  @ApiProperty() @Type(() => Number) @IsInt() department_id!: number;
}

export class FilterDepartmentsTreeQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;
}

export class FilterDepartmentsByOrgsQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// get-department (singular) — rootDepartments by user permission scope.
export class FilterRootDepartmentsQueryDto extends SearchPaginationQueryDto {}

// get-positions — paginated, filterable by organizations/departments CSV.
export class FilterPositionsQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'CSV organization ids' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ description: 'CSV department ids' })
  @IsOptional()
  @IsString()
  departments?: string;
}

// search-workers — paginated, filterable by organization_id + search/last/first/middle name.
export class FilterSearchWorkersQueryDto extends SearchPaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() last_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() first_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middle_name?: string;
}
