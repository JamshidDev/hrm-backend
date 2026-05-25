// Topic exam DTO'lar. Laravel: Exam/TopicExamController + TopicExamQuestionController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryTopicExamDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateExamDto {
  @ApiProperty({ description: 'Exam title', example: 'Module 1 exam' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Deadline timestamp (ISO)' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Number of variants', default: 4 })
  @IsOptional()
  @IsInt()
  variant?: number;

  @ApiPropertyOptional({ description: 'Allowed time in minutes', default: 45 })
  @IsOptional()
  @IsInt()
  minute?: number;

  @ApiPropertyOptional({
    description: 'Question count per variant',
    default: 36,
  })
  @IsOptional()
  @IsInt()
  tests_count?: number;

  @ApiPropertyOptional({ description: 'Allowed attempts', default: 1 })
  @IsOptional()
  @IsInt()
  chances?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Exam description (markdown allowed)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Audience (1=all, 2=selected)' })
  @IsOptional()
  @IsInt()
  whom?: number;

  @ApiPropertyOptional({ description: 'Require camera (video proctoring)' })
  @IsOptional()
  @IsBoolean()
  camera?: boolean;

  // Laravel: whom_ids — whom=2 bo'lsa positions[], whom=3 bo'lsa worker_position[].
  @ApiPropertyOptional({
    description: 'whom=2 → position_id[], whom=3 → worker_position_id[]',
    type: [Number],
    example: [5],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  whom_ids?: number[];
}

// Laravel UpdateExamRequest — barcha field'lar `sometimes` (optional).
// PATCH-style update: ixtiyoriy field'lar kelgan bo'lsa yangilanadi.
export class UpdateExamDto {
  @ApiPropertyOptional({ description: 'Exam title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Deadline timestamp (ISO)' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Number of variants' })
  @IsOptional()
  @IsInt()
  variant?: number;

  @ApiPropertyOptional({ description: 'Allowed time in minutes' })
  @IsOptional()
  @IsInt()
  minute?: number;

  @ApiPropertyOptional({ description: 'Question count per variant' })
  @IsOptional()
  @IsInt()
  tests_count?: number;

  @ApiPropertyOptional({ description: 'Allowed attempts' })
  @IsOptional()
  @IsInt()
  chances?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Exam description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Audience (whom)' })
  @IsOptional()
  @IsInt()
  whom?: number;

  @ApiPropertyOptional({ description: 'Require camera' })
  @IsOptional()
  @IsBoolean()
  camera?: boolean;

  @ApiPropertyOptional({
    description: 'whom=2 → position_id[], whom=3 → worker_position_id[]',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  whom_ids?: number[];
}
