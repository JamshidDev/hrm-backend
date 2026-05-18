// Category question DTO'lar. Laravel: Exam/TopicQuestionController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryCategoryQuestionDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
}

export class QuestionOptionDto {
  @ApiProperty({ description: 'Option text' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Mark as correct answer', default: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  ques!: string;

  @ApiPropertyOptional({ type: [QuestionOptionDto], description: 'Answer options' })
  @IsOptional()
  @IsArray()
  options?: QuestionOptionDto[];
}

export class UpdateQuestionDto extends CreateQuestionDto {}
