// Lessons DTO'lari. Laravel: LessonStoreRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,

  Min,
} from 'class-validator';

export class LessonListQueryDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  group_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacher_id?: number;
}

export class UpsertLessonDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  learning_center_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  edu_plan_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  group_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  subject_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  teacher_id!: number;

  @ApiProperty({ example: '2026-03-15' })
  @IsString()
  @IsNotEmpty()
  lesson_date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  @IsNotEmpty()
  end_time!: string;

  @ApiPropertyOptional({ example: 'NestJS Module Architecture' })
  @IsOptional()
  @IsString()
  name?: string;
}
