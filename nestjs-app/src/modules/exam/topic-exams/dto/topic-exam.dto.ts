// Topic exam DTO'lar. Laravel: Exam/TopicExamController + TopicExamQuestionController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

  @ApiPropertyOptional({ description: 'Question count per variant', default: 36 })
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
}

export class UpdateExamDto extends CreateExamDto {}
