// EduPlans DTO. Laravel: HR routes use LMS controllers (5 endpoints).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryEduPlansDto extends SearchPaginationQueryDto {}

export class SearchEduPlanWorkersDto extends SearchPaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('edu_plans', 'id')
  edu_plan_id!: number;

  // Laravel WorkerPosition::filter — org-scope (organizations + organization_id).
  @ApiPropertyOptional({ example: '199' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 222 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export class AttachEduPlanWorkersDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  edu_plan_id!: number;

  @ApiProperty({ type: () => [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  worker_position_ids!: number[];
}

export class AttachedEduPlanWorkersQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  @ApiPropertyOptional({ example: '151,154' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 222 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export class DetachEduPlanWorkersDto {
  @ApiProperty({ type: () => [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids!: number[];
}
