// Edu-plans DTO'lari. Laravel: EduPlanStoreRequest.
// type: 1=Sirtqi, 2=Kunduzgi (EduPlanTypeEnum).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,

  Min,
} from 'class-validator';

export class EduPlanListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @ApiPropertyOptional({ example: 'NestJS 2026' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  learning_center_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  specialization_id?: number;
}

export class UpsertEduPlanDto {
  @ApiProperty({ example: 'NestJS Backend Bootcamp 2026' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  learning_center_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  specialization_id!: number;

  @ApiPropertyOptional({ example: 1, description: '1=Sirtqi, 2=Kunduzgi' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hours?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  count_groups?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  count_workers?: number;

  // Laravel: 'serial' => 'nullable|integer' (SerialTypeEnum: 1=MO-RW, 2=MO-LM, 3=MO-SM)
  @ApiPropertyOptional({ example: 2, description: '1=MO-RW, 2=MO-LM, 3=MO-SM' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serial?: number;

  // Laravel: `if ($request->subjects) $eduPlan->subjects()->sync($request->subjects)`.
  // Pivot: edu_plan_subjects (edu_plan_id, subject_id) — delete-then-insert.
  @ApiPropertyOptional({ example: [34, 32], type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  subjects?: number[];
}

export class DetachEduPlanWorkersDto {
  @ApiProperty({ example: [10, 11, 12], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  worker_ids!: number[];
}
