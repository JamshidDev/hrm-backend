// AI OpenAI DTO'lari. Laravel: AILawyerRequest, AILikeRequest, AIQuestionsByDateRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AiLawyerDto {
  @ApiProperty({ example: 'Mehnat shartnomasini bekor qilish' })
  @IsString()
  question!: string;
}

export class AiLikeDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  like!: boolean;
}

export class AiQuestionsByDateDto {
  @ApiProperty({ example: '2026-05-18' })
  @IsDateString()
  date!: string;
}

export class AiHistoryQueryDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;
}
