// DepartmentLocation DTO. Laravel: HR/DepartmentLocationController (apiResource + list).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryDepartmentLocationDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
}

export class CreateDepartmentLocationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('departments', 'id')
  department_id!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  geo_type!: boolean;

  @ApiProperty({ example: 41.31 }) @Type(() => Number) @IsNumber() lat!: number;
  @ApiProperty({ example: 69.27 }) @Type(() => Number) @IsNumber() lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  radius?: number;
  @ApiPropertyOptional() @IsOptional() polygon?: unknown;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accuracy_limit?: number;
}

export class UpdateDepartmentLocationDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() geo_type?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  radius?: number;
  @ApiPropertyOptional() @IsOptional() polygon?: unknown;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accuracy_limit?: number;
}
