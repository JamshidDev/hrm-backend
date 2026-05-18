// Reports DTO. Laravel: HR/ReportController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class ReportStructureQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class ReportDepartmentsQueryDto extends SearchPaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;
}

export class ReportDepartmentPositionsQueryDto extends SearchPaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
}

export class ReportWorkerPositionsQueryDto extends SearchPaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_position_id?: number;
}

export class ReportOptimizationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('departments', 'id')
  department_id!: number;
}

export class OrderableItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  sort!: number;
}

export class ReportOrderableDto {
  @ApiProperty({ enum: ['department', 'position'] })
  @IsIn(['department', 'position'])
  type!: 'department' | 'position';

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  department_id?: number;

  @ApiProperty({ type: () => [OrderableItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderableItemDto)
  order!: OrderableItemDto[];
}
