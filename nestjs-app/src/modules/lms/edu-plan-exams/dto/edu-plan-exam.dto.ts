// Edu-plan-exams DTO'lari. Laravel: EduPlanExamController.
// exam_type: 1=Default, 2=…, 3=Final (ExamTypeEnum).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// GET /lms/exams/result — Laravel: EduPlanExamController::results.
//   search (worker fullname CONCAT ILIKE), topics (csv), exams (csv).
export class ExamResultQueryDto {
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

  @ApiPropertyOptional({ example: 'Abidjanova' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '1,2', description: 'CSV topic ids' })
  @IsOptional()
  @IsString()
  topics?: string;

  @ApiPropertyOptional({ example: '5,6', description: 'CSV exam ids' })
  @IsOptional()
  @IsString()
  exams?: string;
}

export class EduPlanExamListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel'da `per_page` cheklov yo'q.
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
}

export class AttachEduPlanExamDto {
  // Laravel: edu_plan_id YOKI lesson_id'dan biri shart. Service-level check.
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  exam_id!: number;

  @ApiPropertyOptional({
    example: 3,
    description: '1=Default, 2=Middle, 3=Final',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  exam_type?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lesson_id?: number;
}
